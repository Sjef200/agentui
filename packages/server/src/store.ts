import type { AgentEvent } from '@agent-ui/core';

/**
 * Per-session metadata, as returned by `GET /sessions` and `GET /sessions/:id`.
 * Shape is fixed by `docs/CONTRACT.md`.
 */
export interface SessionMeta {
  id: string;
  agent: string;
  /** ts of the session's first event. */
  startedAt: number;
  eventCount: number;
  /** ts of the session's latest event. */
  lastTs: number;
}

/**
 * Persistence + read interface. Both backends (JSONL, SQLite) implement this and
 * `AGENT_UI_STORE` selects one. SSE replay and the Sessions API read through it,
 * so `getEvents` is the source of truth for ordering and replay.
 */
export interface Store {
  /** Persist one event and update the session index. */
  append(event: AgentEvent): void;
  /** Events for a session ordered by seq, optionally only those with seq > afterSeq. */
  getEvents(session: string, afterSeq?: number): AgentEvent[];
  /** All sessions, sorted by lastTs desc. */
  listSessions(): SessionMeta[];
  getSession(id: string): SessionMeta | undefined;
  /** Release any resources (file handles, db connection). */
  close(): void;
}
