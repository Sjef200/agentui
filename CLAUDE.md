# Agent UI — project memory for Claude Code

## What this is

Tool-agnostic, real-time observability for AI coding agents. Everything an agent
does is normalized into ONE event schema (see packages/core). Adapters translate
each tool into the schema; every UI surface reads only the schema.

## Hard scope guardrails (v1 is NOT)

- not an IDE/editor, no chat back to the agent, no accounts/cloud/telemetry
- no multi-user, no AI/analysis on top of events
- runs fully locally

Whenever an idea does not fit the four stripes (capture → adapters → core →
surfaces), it belongs on the roadmap, not in v1.

## Repo map

pnpm monorepo. packages/core (schema + types + validate + redact, the contract),
server (ingest + SSE + store), ui (React + Vite + Tailwind), cli (`agent-ui` bin),
adapter-\* (per-tool translators), vscode (extension, later). fixtures/ holds
recorded JSONL streams used for ALL development and tests.

## Conventions

- TypeScript strict, no `any`. Conventional Commits. One feature per PR.
- Add Vitest tests with every change; adapters use golden-file tests
  (fixture in -> expected normalized events out).
- NEVER invent agent output. Build and test against fixtures/. Live-agent
  capture is verified locally by the maintainer, not in the sandbox.
- Confirm CLI specifics (output flags, hook names, on-disk session paths)
  against the installed version via `--help` before coding to them.

## Dev loop (no live agent needed)

1. `pnpm install && pnpm -r build`
2. run the server: `pnpm --filter @agent-ui/server dev` (API + SSE on :4317)
3. run the UI: `pnpm --filter @agent-ui/ui dev` (dashboard on :5173)
4. stream a fixture: `node packages/cli/dist/index.js demo` (or `npx @agent-ui/cli demo`)
5. open the dashboard and verify events render live.

## Commands

- `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build` — run across the workspace.
- Per package: `pnpm --filter <name> <script>`.

## Status (implemented)

- core: schema + `validate`/`makeEvent`/`redact` (zero runtime deps but zod).
- server: `POST /ingest`, `GET /stream` (SSE, Last-Event-ID), `GET /sessions[/:id]`,
  `GET /healthz`; Store interface with JSONL (default) + SQLite backends
  (`AGENT_UI_STORE`); `redact()` runs in the ingest path. Default port 4317.
- cli: `agent-ui demo` fixture player (pacing + `--fast`/`--speed`/`--server`/`--session`);
  `watch`/`ingest`/`replay`/`init` are stubs for the local-only phases.
- ui: live virtualized timeline, file_edit/command/message/tool detail views,
  token meter, session switcher, filters. Reads only the schema.
- The HTTP/SSE/Store contract is pinned in `docs/CONTRACT.md`.

## Not yet (verified locally, not in the sandbox)

- adapter-claude-code / adapter-codex parsers, `agent-ui watch` (Phases 5/7).
- log tailing → import + `agent-ui replay` (Phase 6.2). VS Code / Chrome surfaces.
