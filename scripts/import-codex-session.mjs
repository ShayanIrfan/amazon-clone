#!/usr/bin/env node
// One-off: convert a Codex CLI/IDE rollout (~/.codex/sessions/**/rollout-*.jsonl) into the
// 8x .agent-logs format. Codex has no hook we could wire in advance, so its session file
// is the raw record. Prompts come from `user_message` events verbatim; responses are the
// `last_agent_message` of each `task_complete` event (final reply only, no commentary).
//
// usage: node scripts/import-codex-session.mjs <rollout.jsonl> [author] [project]

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const [src, author = "Shayan Irfan", project = "amazon-clone"] = process.argv.slice(2);
if (!src) {
  console.error("usage: node scripts/import-codex-session.mjs <rollout.jsonl> [author] [project]");
  process.exit(1);
}

const entries = [];
let sessionId = null;
let model = "unknown";

const rl = readline.createInterface({ input: fs.createReadStream(src) });
for await (const line of rl) {
  let o;
  try {
    o = JSON.parse(line);
  } catch {
    continue;
  }
  const p = o.payload || {};
  if (o.type === "session_meta") sessionId ??= p.id || p.session_id;
  if (o.type === "turn_context" && p.model) model = p.model;
  if (o.type !== "event_msg") continue;
  if (p.type === "user_message") {
    entries.push({ type: "PROMPT", timestamp: o.timestamp, model, text: p.message ?? "" });
  } else if (p.type === "task_complete") {
    entries.push({ type: "RESPONSE", timestamp: o.timestamp, model, text: p.last_agent_message ?? "" });
  }
}

if (!sessionId || !entries.length) {
  console.error("no session id or no prompts found");
  process.exit(1);
}

const short = sessionId.slice(0, 8);
let num = 0;
let body = "";
for (const e of entries) {
  if (e.type === "PROMPT") num += 1;
  body += `[LOG_ENTRY type=${e.type} num=${num} session=${short}]\n`;
  body += `timestamp: ${e.timestamp}\nmodel: ${e.model}\n\n${e.text.replace(/\r\n/g, "\n")}\n\n\n`;
}

const prompts = entries.filter((e) => e.type === "PROMPT");
const first = prompts[0].timestamp;
const date = first.slice(0, 10);
const models = [...new Set(entries.map((e) => e.model))].join(", ");
const header = [
  "---",
  `session_id: ${sessionId}`,
  `date: ${date}`,
  `author: ${author}`,
  `model: ${models}`,
  "tool: codex",
  `project: ${project}`,
  `total_exchanges: ${prompts.length}`,
  `first_prompt_time: ${first}`,
  `last_prompt_time: ${prompts.at(-1).timestamp}`,
  "---",
  "",
  `# Session Log - ${date}`,
  "",
  `Session: \`${short}\` | Project: \`${project}\` | Author: \`${author}\``,
  "",
  `Imported from Codex rollout \`${path.basename(src)}\` by \`scripts/import-codex-session.mjs\`.`,
  "",
  "---",
  "",
  "",
].join("\n");

const out = path.join(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
  "..",
  ".agent-logs",
  `${first.slice(0, 19).replace("T", "_").replace(/:/g, "-")}_${sessionId}.md`,
);
fs.writeFileSync(out, header + body);
console.log(`${prompts.length} prompts, ${entries.length - prompts.length} responses -> ${out}`);
