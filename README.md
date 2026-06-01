# Agent UI

> See what your AI coding agent is actually doing, in real time.

A clean, real-time UI for what an AI coding agent actually does — file edits,
commands, tool calls, messages, and token/cost usage. Tool-agnostic from day one
(Claude Code, Codex CLI, OpenCode, Cline): everything an agent does is normalized
into **one event schema**, adapters translate each tool into that schema, and every
surface reads only the schema. Runs fully locally — no accounts, no cloud, no
telemetry.

## Quickstart

```bash
# stream a recorded session — needs no live agent
npx agent-ui demo
```

_(Full quickstart, architecture, and the event-schema contract land in the Phase 10
README rewrite.)_

## License

[MIT](./LICENSE)
