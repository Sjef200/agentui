---
'@agent-ui/core': minor
'@agent-ui/server': minor
'@agent-ui/cli': minor
---

Initial public release.

- **core**: the normalized event schema with `validate`, `makeEvent`, and secret `redact`.
- **server**: Fastify ingest, SSE `/stream` (with `Last-Event-ID` reconnection), the
  sessions API, and a pluggable store (JSONL default, SQLite optional).
- **cli**: the `agent-ui demo` fixture player.
