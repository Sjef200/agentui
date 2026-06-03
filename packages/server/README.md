# @agent-ui/server

The ingest + SSE + store server for [Agent UI](https://github.com/Sjef200/agentui).
It receives normalized [`@agent-ui/core`](https://www.npmjs.com/package/@agent-ui/core)
events, redacts secrets, persists them, and streams them to surfaces.

```ts
import { buildServer } from '@agent-ui/server';

const server = buildServer();
await server.listen({ port: 4317, host: '127.0.0.1' });
```

Endpoints: `POST /ingest`, `GET /stream?session=<id>` (Server-Sent Events with
`Last-Event-ID` reconnection), `GET /sessions`, `GET /sessions/:id`, `GET /healthz`.

Storage is pluggable behind one `Store` interface: JSONL files (default) or SQLite
(`AGENT_UI_STORE=sqlite`). Configurable via `PORT`, `HOST`, `DATA_DIR`,
`AGENT_UI_STORE`, `RING_CAP`.

## License

MIT
