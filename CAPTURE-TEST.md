# Capture Test — 8x assignment, Shayan Irfan

Status: **passing**. Canaries from two separate Claude Code sessions both landed in
`.agent-logs/` with prompt and response.

## 1. Tool and model

| | |
|---|---|
| Tool | Claude Code 2.1.270 (CLI), Windows 11, run from `D:\Projects\amazon-clone` |
| Model | `claude-opus-5` (Opus 5) — plans and executes; no other model or subagent used so far |
| Automatic mechanism | Yes — Claude Code lifecycle hooks, checked against the current hooks reference (code.claude.com/docs/en/hooks) before writing anything |

## 2. Mechanism and files changed

Project hooks in **`.claude/settings.json`**, each running
`node ${CLAUDE_PROJECT_DIR}/.claude/hooks/capture.mjs <event>` (exec form with `args`, so it
does not depend on Git Bash vs PowerShell on Windows):

| Hook event | What the script does |
|---|---|
| `UserPromptSubmit` | Appends a `PROMPT` entry with the prompt verbatim (from the hook's `prompt` field) |
| `Stop` | Appends a `RESPONSE` entry with the turn's final text (hook's `last_assistant_message`; falls back to the transcript at `transcript_path`, taking only text blocks after the last tool call) |
| `StopFailure` | Appends a `RESPONSE` entry for a turn that errored, so failures are in the log too |
| `SessionStart` / `PostModelSwitch` | Remember the current model so every entry carries the model name |

Files:

- `.claude/settings.json` — hook wiring
- `.claude/hooks/capture.mjs` — capture script (no dependencies, writes nothing to stdout, always exits 0)
- `.claude/capture.config.json` — `author`, `project`, `tool` for the log header
- `.gitignore` — ignores only `.claude/capture-state/` (the script's counters). `.agent-logs/` is **not** ignored.

Output: one file per session, `.agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md`, in the 8x
format. Timestamps are UTC ISO-8601. Model per entry comes from the transcript's assistant
messages, so a mid-build model switch shows up.

## 3. Where the canaries landed

| Canary | Session | Log file | Entries |
|---|---|---|---|
| 1 | `029bc18c` (the session that installed the hooks) | `.agent-logs/2026-09-13_15-37-56_029bc18c-d333-4e0e-b1cd-37ba89c4950f.md` | PROMPT/RESPONSE num=8 |
| 2 | `78236bce` (fresh `claude` started in a new terminal) | `.agent-logs/2026-09-13_15-52-49_78236bce-8872-42d9-a514-cea97ca811b2.md` | PROMPT/RESPONSE num=1 |

## 4. Canary entries, raw

### Canary 1 — session `029bc18c`

````
[LOG_ENTRY type=PROMPT num=8 session=029bc18c]
timestamp: 2026-09-13T15:52:08.392Z
model: claude-opus-5

CAPTURE TEST — 8x assignment, Shayan Irfan


[LOG_ENTRY type=RESPONSE num=8 session=029bc18c]
timestamp: 2026-09-13T15:52:17.746Z
model: claude-opus-5

Canary 1 received. Its prompt is already in the log as **entry #8** of `.agent-logs/2026-09-13_15-37-56_029bc18c-….md`, with the author now showing as Shayan Irfan. This reply will be saved as response #8 when the turn ends. I'll confirm that when you say done.

**Next: canary 2 in a new session.**
1. Open a new terminal.
2. Run `cd D:\Projects\amazon-clone` and then `claude`.
3. Accept the trust or hooks prompt if it appears.
4. Send `CAPTURE TEST — 8x assignment, Shayan Irfan`
5. Wait for the reply, then close that session.
6. Come back here and type **done**.
````

### Canary 2 — session `78236bce`

````
[LOG_ENTRY type=PROMPT num=1 session=78236bce]
timestamp: 2026-09-13T15:52:49.365Z
model: claude-opus-5

CAPTURE TEST — 8x assignment, Shayan Irfan


[LOG_ENTRY type=RESPONSE num=1 session=78236bce]
timestamp: 2026-09-13T15:53:09.356Z
model: claude-opus-5

The capture hook recorded your prompt. The response half will only show up after I finish this reply.

**What's working now:**
- **SessionStart:** the hook created `.agent-logs/2026-09-13_15-52-49_78236bce-8872-42d9-a514-cea97ca811b2.md` with the right header: author `Shayan Irfan`, model `claude-opus-5`, project `amazon-clone`.
- **UserPromptSubmit:** your prompt is saved as `LOG_ENTRY type=PROMPT num=1`, with its timestamp and the exact text, including the em dash.
- **State:** `.claude/capture-state/78236bce-….json` shows `count: 1` and `awaitingResponse: true`. So the hook is waiting to add my reply when the Stop hook runs.

**What still needs checking, after this reply:**
1. The same log file should get a response entry for exchange 1.
2. The state file should switch to `awaitingResponse: false`.
3. `.claude/capture-state/last-input-stop.json` should update to this session's ID.

If you send one more prompt, I can read those back to confirm the Stop hook worked. That turn also tests whether `num=2` and `total_exchanges` go up correctly. The earlier session's log (`029bc18c…`, 14 KB) looks like it already holds complete exchanges, so you can use it as the reference for what a finished entry should look like.
````

(Canary 2's response is wrong in one detail: the log file was created by the
`UserPromptSubmit` hook, not `SessionStart`. It is left as captured.)

## 5. What did not work first / caveats

- **Dry run caught a bug.** Before wiring the hooks I ran the script against synthetic hook
  inputs and fake transcripts (multi-line prompt with an em dash, a prompt containing a fake
  `[LOG_ENTRY` line, text before and after a tool call, a background-task re-invocation of
  `Stop`, a model switch, a failed turn, lost state). A failed turn (`StopFailure`) picked up
  the *previous* turn's response text and model from the transcript. Fixed by only trusting
  transcript text when the transcript's latest prompt matches the prompt being answered.
- **Hooks installed mid-session.** In session `029bc18c` the setup guide prompt was sent
  before the hooks existed, so `UserPromptSubmit` never fired for it. The `Stop` hook
  recovers it from the transcript (prompt num=1 carries its transcript timestamp).
  The four earlier prerequisite questions in that session, asked before the guide was
  pasted, are not in the log.
- **Session 1's PROMPT num=3 and num=4 have no RESPONSE.** They are typo'd sends
  ("what to dow now?", "what tod onow?") cancelled within seconds and resent as num=5.
  `UserPromptSubmit` fired for them, but no assistant turn ran, so `Stop` never fired and
  they do not appear in the session transcript. The log is accurate; left untouched.
  (An earlier draft of this file wrongly described this as a duplicate RESPONSE num=1;
  checking the log against the transcript before committing corrected it.)
- **Unverified field shapes, confirmed live.** The docs did not show example input for
  `Stop` or `SessionStart`, so the script tolerates missing fields. Captured real inputs
  confirmed `last_assistant_message` on `Stop` and `model: "claude-opus-5"` (a string) on
  `SessionStart`.
- `StopFailure` and `PostModelSwitch` were only exercised in the dry run, not live.
- Hook errors go to `.claude/capture-state/errors.log` (git-ignored); it was empty after both canaries.
