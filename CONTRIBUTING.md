# Contributing to Agent UI

Thanks for helping build honest, real-time observability for AI coding agents.

## The one rule that shapes everything

Everything an agent does is normalized into **one event schema** (`packages/core`).
Adapters translate a tool's native output into that schema; every UI surface reads
**only** the schema. If you are adding support for a new agent, you are writing one
small adapter — you should not be touching the UI.

## Scope (v1 is NOT)

- not an IDE/editor, no chat back to the agent, no accounts/cloud/telemetry
- no multi-user, no AI/analysis on top of events
- runs fully locally

If your idea doesn't fit the pipeline (capture → adapters → core → surfaces), it's
probably a roadmap item, not a v1 change.

## Workflow

1. **One feature per PR.** Keep changes focused and reviewable.
2. Branch from `main`, open a PR against `main`.
3. **Conventional Commits** for every commit and PR title, e.g.
   `feat(server): add SSE stream endpoint`, `fix(core): reject unknown event type`.
4. Add **Vitest tests** with every change. Adapters use **golden-file tests**
   (recorded raw input → expected normalized events).
5. Update `README.md` / `CLAUDE.md` if conventions change.
6. Add a **changeset** (`pnpm changeset`) for any user-facing change.

## Definition of Done (per PR)

- typecheck green · lint clean · tests added and green · CI green
- README / CLAUDE.md updated if relevant · changeset added
- no `any` · one feature per PR

## Local development

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

You do **not** need a live agent to develop. Build and test against the recorded
JSONL streams in `fixtures/`. Live-capture work (the Claude Code / Codex adapters,
log tailing) is verified locally against an installed CLI — confirm CLI specifics
with `--help` before coding to them, and never hard-code output formats you only
*think* are correct.
