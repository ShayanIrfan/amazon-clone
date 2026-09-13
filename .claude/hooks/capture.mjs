#!/usr/bin/env node
// Claude Code hook: records each user prompt and the final response of that turn
// into .agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md (8x assignment format).
//
// Wired in .claude/settings.json:
//   SessionStart     -> capture.mjs session-start   (remember the model)
//   UserPromptSubmit -> capture.mjs prompt          (PROMPT entry, verbatim)
//   PostModelSwitch  -> capture.mjs model-switch    (remember the new model)
//   Stop             -> capture.mjs stop            (RESPONSE entry, final text only)
//   StopFailure      -> capture.mjs stop-failure    (RESPONSE entry for a turn that errored)
//
// Never prints to stdout: for UserPromptSubmit/SessionStart, stdout is injected into
// the model's context. Never exits non-zero: capture must not block the session.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOG_DIR = process.env.CAPTURE_LOG_DIR || path.join(ROOT, ".agent-logs");
const STATE_DIR = process.env.CAPTURE_STATE_DIR || path.join(ROOT, ".claude", "capture-state");
const CONFIG_PATH = path.join(ROOT, ".claude", "capture.config.json");

const event = process.argv[2];

main()
  .catch((err) => logError(err))
  .finally(() => process.exit(0));

async function main() {
  const raw = await readStdin();
  const input = raw.trim() ? JSON.parse(raw) : {};

  fs.mkdirSync(STATE_DIR, { recursive: true });
  // Raw hook input of the latest call per event, for debugging field names.
  fs.writeFileSync(path.join(STATE_DIR, `last-input-${event}.json`), JSON.stringify(input, null, 2));

  if (input.agent_id) return; // subagent turns are not the user's prompts
  const sessionId = input.session_id;
  if (!sessionId) throw new Error(`no session_id in ${event} input`);

  const state = loadState(sessionId);
  const inputModel = modelName(input.model);
  if (inputModel) state.model = inputModel;

  if (event === "prompt") {
    recordPrompt(state, sessionId, {
      text: input.prompt ?? "",
      timestamp: new Date().toISOString(),
      promptId: input.prompt_id,
      model: state.model || readTurn(input.transcript_path).lastModel || "unknown",
    });
    state.awaitingResponse = true;
  } else if (event === "stop" || event === "stop-failure") {
    await recordResponse(state, sessionId, input);
  }

  saveState(sessionId, state);
}

function recordPrompt(state, sessionId, { text, timestamp, promptId, model }) {
  state.count += 1;
  state.firstPromptTime ??= timestamp;
  state.lastPromptTime = timestamp;
  state.model = model;
  if (promptId) state.promptIds.push(promptId);
  state.lastPromptText = text;
  writeEntry(state, sessionId, "PROMPT", state.count, timestamp, model, text);
}

async function recordResponse(state, sessionId, input) {
  const hookText = typeof input.last_assistant_message === "string" ? input.last_assistant_message : "";
  let turn = readTurn(input.transcript_path);

  // The final assistant entry can land in the transcript a moment after Stop fires.
  for (let i = 0; i < 6 && !hookText && !turn.finalText; i++) {
    await sleep(250);
    turn = readTurn(input.transcript_path);
  }

  // Prompt hook did not run for this turn (e.g. hooks were installed mid-turn):
  // take the prompt from the transcript so the response is never orphaned.
  const p = turn.prompt;
  const isLogged = (x) =>
    x && ((x.promptId && state.promptIds.includes(x.promptId)) || x.text === state.lastPromptText);
  if (!state.awaitingResponse && p && !isLogged(p)) {
    recordPrompt(state, sessionId, {
      text: p.text,
      timestamp: p.timestamp || new Date().toISOString(),
      promptId: p.promptId,
      model: turn.turnModel || state.model || "unknown",
    });
  }

  // Only trust transcript text/model if its latest prompt is the one being answered;
  // otherwise (transcript lagging, failed turn) it belongs to an earlier turn.
  const current = p && (p.promptId === state.promptIds.at(-1) || p.text === state.lastPromptText);
  if (!current) turn = { ...turn, finalText: "", turnModel: null };

  let text = hookText || turn.finalText;
  if (event === "stop-failure" && !text) {
    const { transcript_path, cwd, scratchpad_dir, ...rest } = input;
    text = `(turn ended with an error)\n\n${JSON.stringify(rest, null, 2)}`;
  }

  const model = turn.turnModel || state.model || "unknown";
  state.model = model;
  state.awaitingResponse = false;
  writeEntry(state, sessionId, "RESPONSE", state.count, new Date().toISOString(), model, text);
}

// --- transcript -------------------------------------------------------------

function readTurn(transcriptPath) {
  const result = { prompt: null, finalText: "", turnModel: null, lastModel: null };
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return result;

  const entries = [];
  for (const line of fs.readFileSync(transcriptPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // partially written last line
    }
  }

  let promptIdx = -1;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.type === "assistant" && !e.isSidechain && realModel(e)) result.lastModel = realModel(e);
    const text = promptText(e);
    if (text !== null) {
      promptIdx = i;
      result.prompt = { text, timestamp: e.timestamp, promptId: e.promptId };
    }
  }

  // Final response = assistant text blocks after the last tool call of the turn.
  let texts = [];
  for (let i = promptIdx + 1; i < entries.length; i++) {
    const e = entries[i];
    if (e.isSidechain || e.type !== "assistant") continue;
    if (realModel(e)) result.turnModel = realModel(e);
    const content = e.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === "tool_use") texts = [];
      else if (block.type === "text" && block.text) texts.push(block.text);
    }
  }
  result.finalText = texts.join("\n\n");
  return result;
}

function promptText(e) {
  if (e.type !== "user" || e.isMeta || e.isSidechain || e.isCompactSummary) return null;
  const content = e.message?.content;
  let text = null;
  if (typeof content === "string") text = content;
  else if (Array.isArray(content)) {
    if (content.some((b) => b.type === "tool_result")) return null;
    text = content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  }
  if (!text) return null;
  if (/^\s*<(local-command-|command-name>|command-message>|task-notification|system-reminder)/.test(text)) return null;
  return text;
}

function realModel(e) {
  const m = e.message?.model;
  return m && m !== "<synthetic>" ? m : null;
}

function modelName(m) {
  if (typeof m === "string" && m) return m;
  if (m && typeof m === "object") return m.id || m.model || m.name || null;
  return null;
}

// --- log file ---------------------------------------------------------------

function writeEntry(state, sessionId, type, num, timestamp, model, text) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  state.file ??= findLogFile(sessionId) || `${fileStamp(state.firstPromptTime || timestamp)}_${sessionId}.md`;
  const file = path.join(LOG_DIR, state.file);

  let body = "";
  if (fs.existsSync(file)) {
    const current = fs.readFileSync(file, "utf8");
    const start = current.indexOf("\n[LOG_ENTRY ");
    body = start >= 0 ? current.slice(start + 1) : "";
  }
  body += `[LOG_ENTRY type=${type} num=${num} session=${sessionId.slice(0, 8)}]\n`;
  body += `timestamp: ${timestamp}\nmodel: ${model}\n\n${text}\n\n\n`;

  atomicWrite(file, header(state, sessionId) + body);
}

function header(state, sessionId) {
  const cfg = loadConfig();
  const date = (state.firstPromptTime || new Date().toISOString()).slice(0, 10);
  return [
    "---",
    `session_id: ${sessionId}`,
    `date: ${date}`,
    `author: ${cfg.author}`,
    `model: ${state.model || "unknown"}`,
    `tool: ${cfg.tool}`,
    `project: ${cfg.project}`,
    `total_exchanges: ${state.count}`,
    `first_prompt_time: ${state.firstPromptTime || ""}`,
    `last_prompt_time: ${state.lastPromptTime || ""}`,
    "---",
    "",
    `# Session Log - ${date}`,
    "",
    `Session: \`${sessionId.slice(0, 8)}\` | Project: \`${cfg.project}\` | Author: \`${cfg.author}\``,
    "",
    "---",
    "",
    "",
  ].join("\n");
}

function findLogFile(sessionId) {
  if (!fs.existsSync(LOG_DIR)) return null;
  return fs.readdirSync(LOG_DIR).find((f) => f.endsWith(`_${sessionId}.md`)) || null;
}

function fileStamp(iso) {
  return iso.slice(0, 19).replace("T", "_").replace(/:/g, "-");
}

function atomicWrite(file, content) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content);
  try {
    fs.renameSync(tmp, file);
  } catch {
    fs.writeFileSync(file, content); // Windows: target locked by an editor
    fs.rmSync(tmp, { force: true });
  }
}

// --- state / config ---------------------------------------------------------

function loadState(sessionId) {
  const file = path.join(STATE_DIR, `${sessionId}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));

  const state = { count: 0, promptIds: [], awaitingResponse: false };
  // State lost but a log exists (e.g. resumed on a fresh clone): recover the counters.
  const existing = findLogFile(sessionId);
  if (existing) {
    state.file = existing;
    const text = fs.readFileSync(path.join(LOG_DIR, existing), "utf8");
    const re = new RegExp(
      `^\\[LOG_ENTRY type=PROMPT num=(\\d+) session=${sessionId.slice(0, 8)}\\]\\r?\\ntimestamp: (\\S+)\\r?\\nmodel: (\\S+)$`,
      "gm",
    );
    for (const m of text.matchAll(re)) {
      state.count = Number(m[1]);
      state.firstPromptTime ??= m[2];
      state.lastPromptTime = m[2];
      state.model = m[3];
    }
  }
  return state;
}

function saveState(sessionId, state) {
  fs.writeFileSync(path.join(STATE_DIR, `${sessionId}.json`), JSON.stringify(state, null, 2));
}

function loadConfig() {
  const defaults = { author: "unknown", project: path.basename(ROOT), tool: "claude-code" };
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) };
  } catch {
    return defaults;
  }
}

// --- misc -------------------------------------------------------------------

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function logError(err) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.appendFileSync(
      path.join(STATE_DIR, "errors.log"),
      `${new Date().toISOString()} [${event}] ${err?.stack || err}${os.EOL}`,
    );
  } catch {
    // nothing left to do
  }
}
