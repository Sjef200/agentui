# Agent UI

> **See what your AI coding agent is actually doing, in real time.**

A clean, real-time UI for what an AI coding agent actually does — file edits,
commands, tool calls, messages, and token/cost usage. Tool-agnostic from day one
(Claude Code, Codex CLI, OpenCode, Cline): **everything an agent does is normalized
into one event schema**, adapters translate each tool into that schema, and every
surface (web dashboard, VS Code panel, …) reads only the schema. It runs **fully
locally** — no accounts, no cloud, no telemetry.

## Demo

![Agent UI streaming a recorded session](docs/demo.gif)

> _Placeholder — record this locally: start the server, run `agent-ui demo`, and
> capture the dashboard. See [Quickstart](#quickstart)._

## Why

When an agent edits ten files and runs a dozen commands, the terminal scrollback is
a poor way to see what happened. Agent UI gives you an honest, fast, structured view
of the run — a virtualized timeline of every action, colored diffs, command exit
codes, and a live token/cost meter — without getting in the agent's way. It does not
talk back to the agent; it observes.

## Quickstart

### Watch a recorded session (no live agent needed)

Everything below works against recorded JSONL fixtures, so you can try the whole
thing without any agent installed.

```bash
pnpm install
pnpm -r build

# terminal 1 — the API + SSE server on http://127.0.0.1:4317
pnpm --filter @agent-ui/server dev

# terminal 2 — the dashboard on http://localhost:5173
pnpm --filter @agent-ui/ui dev

# terminal 3 — replay a recorded fixture into the server
node packages/cli/dist/index.js demo            # or: npx @agent-ui/cli demo
```

Open the dashboard and watch the events stream in. `demo` paces by the recorded
timestamps; add `--fast` to dump instantly, `--speed <n>` to scale, or pass a
specific fixture path.

### Watch a live agent (verified locally)

```bash
npx @agent-ui/cli watch -- claude   # wrap the agent through its adapter
```

Live capture — the Claude Code / Codex adapters and log tailing — is verified
locally against an installed CLI and is on the [roadmap](#roadmap); the schema,
server, CLI player, UI, and redaction are all here today and fully tested.

## The contract: one event schema

Everything rests on a single normalized event (`@agent-ui/core`). Adapters write
only this; every surface reads only this.

```ts
interface BaseEvent {
  v: 1;
  id: string;        // unique
  session: string;   // groups one agent run
  seq: number;       // monotonic within a session → ordering + replay
  ts: number;        // epoch ms
  agent: string;     // "claude-code" | "codex" | "opencode" | "cline" | …
  type: EventType;
  data: …;           // shape depends on type (discriminated union)
}
```

| `type`          | `data` payload                                          |
| --------------- | ------------------------------------------------------- |
| `session_start` | `{ cwd?, title? }`                                       |
| `session_end`   | `{ reason? }`                                            |
| `message`       | `{ role: "user" \| "assistant", text }`                  |
| `tool_call`     | `{ name, args? }`                                        |
| `tool_result`   | `{ name, ok, result? }`                                  |
| `file_edit`     | `{ path, diff?, before?, after? }`                       |
| `command`       | `{ cmd, cwd?, exitCode?, stdout?, stderr? }`             |
| `token_usage`   | `{ input, output, costUsd? }`                            |
| `error`         | `{ message, detail? }`                                   |

`validate()` (zod-backed) rejects unknown types and missing/ill-typed fields;
`makeEvent()` fills `v`/`id`/`ts`; `redact()` scrubs secrets from event data before
it is ever stored or streamed.

## Architecture

```
agents → capture → adapters → core (schema) → surfaces
```

1. **Agents** — Claude Code, Codex CLI, … anything that produces a stream of actions.
2. **Capture** — wrap/pipe stdout, hooks, log tailing, or an API proxy.
3. **Adapters** — per-tool translators: native output in, normalized events out.
4. **Core** — the schema + validation + redaction; the contract everything shares.
5. **Surfaces** — the server ingests events and streams them over SSE; the web
   dashboard, VS Code panel (later), and Chrome side panel (later) render them.

Add a new tool = write one small adapter. Nothing else changes.

## Supported agents

The server, CLI, and UI are **agent-agnostic** — they only speak the core schema.

- **Recorded fixtures:** `claude-code` (basic + edit-heavy), `codex`.
- **Live adapters:** `claude-code` and `codex` adapter packages are scaffolded;
  their parsers are implemented and verified locally against the installed CLIs
  (they need a live agent, which the CI sandbox doesn't have). Two real adapters is
  what makes "tool-agnostic" credible — that's the near-term goal.

## Packages

| Package                          | What it is                                                        |
| -------------------------------- | ----------------------------------------------------------------- |
| `@agent-ui/core`                 | The event schema: types, zod validation, `makeEvent`, redaction.  |
| `@agent-ui/server`               | Fastify ingest + SSE stream + sessions API + JSONL/SQLite store.  |
| `@agent-ui/ui`                   | React + Vite + Tailwind dashboard (reads only the schema).        |
| `@agent-ui/cli`                  | The CLI (`agent-ui` command): `demo` today; `watch`/`ingest`/`replay` next. |
| `@agent-ui/adapter-claude-code`  | Claude Code → core events (verified locally).                     |
| `@agent-ui/adapter-codex`        | Codex CLI → core events (verified locally).                       |

## Scope — v1 is NOT

- not an IDE/editor, no code completion
- not a chat client — you observe the agent here, you don't talk to it
- no accounts, no cloud, no telemetry — everything is local
- no multi-user / team mode
- no AI/analysis layered on top of the events — just an honest, fast view

## Development

```bash
pnpm install
pnpm typecheck   # tsc --noEmit across the workspace
pnpm lint        # eslint (no `any`)
pnpm test        # vitest (117 tests)
pnpm build       # tsup libs + vite UI
```

TypeScript strict everywhere, Conventional Commits, one feature per PR, Vitest with
every change (adapters use golden-file tests). See [CONTRIBUTING.md](./CONTRIBUTING.md)
and [CLAUDE.md](./CLAUDE.md).

## Roadmap

- ✅ Core event schema + validation + redaction
- ✅ Recorded fixtures + fixture player (`agent-ui demo`)
- ✅ Server: ingest, SSE stream, sessions API, JSONL + SQLite store
- ✅ Web dashboard: live timeline, diffs, command details, token meter, filters
- ⏳ Live capture: Claude Code & Codex adapters, `agent-ui watch` (verified locally)
- ⏳ Log tailing → import + `agent-ui replay <session>`
- ⏳ VS Code panel (reuse the dashboard in a Webview; native `vscode.diff`)
- ⏳ Chrome side panel for web agents
- ⏳ npm release of the `@agent-ui/cli` + libraries

## License

[MIT](./LICENSE)
