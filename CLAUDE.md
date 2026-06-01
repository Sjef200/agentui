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

1. `pnpm i`
2. run the server (`pnpm --filter @agent-ui/server dev`)
3. `pnpm --filter agent-ui dev demo fixtures/claude-code-basic.jsonl` to stream a fixture
4. open the UI (`pnpm --filter @agent-ui/ui dev`) and verify events render.

## Commands

- `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build` — run across the workspace.
- Per package: `pnpm --filter <name> <script>`.
