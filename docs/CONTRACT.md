# Internal contract: server API, SSE, and store

This is the agreed interface between the server, the CLI, and the UI so the three
can be built independently. The **event schema** itself is owned by
`@agent-ui/core` (`packages/core/src`) — import it, never redefine it.

## Configuration (server)

Read from env, with these defaults:

| env             | default       | meaning                                  |
| --------------- | ------------- | ---------------------------------------- |
| `PORT`          | `4317`        | HTTP port                                |
| `HOST`          | `127.0.0.1`   | bind address                             |
| `DATA_DIR`      | `.data`       | where JSONL session files are written    |
| `AGENT_UI_STORE`| `jsonl`       | store backend: `jsonl` or `sqlite`       |
| `RING_CAP`      | `5000`        | in-memory live buffer cap per session    |

The default server base URL clients use is `http://127.0.0.1:4317`.

## CORS

Allow any origin (`@fastify/cors` with `origin: true`). The UI dev server
(`http://localhost:5173`) and a future Chrome extension connect cross-origin.

## HTTP endpoints

### `GET /healthz`

`200 { "ok": true }`. Lets the CLI detect a running server.

### `POST /ingest`

Body: a single `AgentEvent` **or** an array of them (JSON).

For each event: `core.validate()` it, then `core.redact()` it, then `store.append()`
it, then broadcast it to SSE subscribers of its session.

- `200 { "ok": true, "count": <n>, "ids": [<id>...] }`
- `400 { "error": "<message>" }` if any event fails validation (reject the whole
  request; nothing is stored).

### `GET /sessions`

`200` with an array of `SessionMeta`, sorted by `lastTs` descending:

```ts
interface SessionMeta {
  id: string;
  agent: string;
  startedAt: number; // ts of the session's first event
  eventCount: number;
  lastTs: number; // ts of the session's latest event
}
```

### `GET /sessions/:id`

`200` with one `SessionMeta`, or `404 { "error": "not found" }`.

### `GET /stream?session=<id>`

Server-Sent Events. If `session` is omitted, use the most-recently-active session
(highest `lastTs`); if there are none, stream nothing until events arrive.

Behaviour:

1. Replay the session's already-stored events in `seq` order.
2. Then stream new events live as they arrive via `/ingest`.

Framing — one SSE message per event:

```
id: <event.seq>
data: <JSON.stringify(event)>

```

- Set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`,
  `Connection: keep-alive`. Emit `retry: 3000` once at the start.
- Send a heartbeat comment (`: ping\n\n`) every ~15s so proxies don't drop idle
  connections.
- **Reconnection:** honor the `Last-Event-ID` request header (the browser
  `EventSource` sets it automatically to the last `id:` it saw). On reconnect,
  replay only events with `seq > Last-Event-ID`, then go live. This makes `seq`
  the per-session SSE id.

## Store interface (server)

Both backends implement the same interface; `AGENT_UI_STORE` selects one. SSE
replay and the Sessions API read through it.

```ts
interface Store {
  append(event: AgentEvent): void;
  /** Events for a session ordered by seq, optionally only those with seq > afterSeq. */
  getEvents(session: string, afterSeq?: number): AgentEvent[];
  /** All sessions, sorted by lastTs desc. */
  listSessions(): SessionMeta[];
  getSession(id: string): SessionMeta | undefined;
  close(): void;
}
```

- **JSONL backend (default):** append each event as a line to
  `${DATA_DIR}/${session}.jsonl`; keep an in-memory index for session metadata.
- **SQLite backend:** `better-sqlite3`, with `sessions` and `events` tables;
  `getEvents` is `SELECT ... WHERE session = ? AND seq > ? ORDER BY seq`.

The server keeps an in-memory per-session buffer (cap `RING_CAP`) for fast live
broadcast, but `getEvents` (used for SSE replay and persistence) is the source of
truth and reads through the store.

## CLI ↔ server

`agent-ui demo <fixture>` reads a JSONL fixture and `POST`s each event to
`/ingest` in order, pacing by the `ts` delta between consecutive events (or
instantly with `--fast`). Default server URL `http://127.0.0.1:4317`, over‑
ridable with `--server <url>`.

## UI ↔ server

The UI connects an `EventSource` to `${SERVER}/stream?session=<id>`, lists
sessions from `GET /sessions`, and reads only the core schema. `SERVER` comes
from `import.meta.env.VITE_AGENT_UI_SERVER` (default `http://127.0.0.1:4317`).
