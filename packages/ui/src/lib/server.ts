/**
 * Server wiring. The UI reads the core event schema over HTTP/SSE; this module
 * owns the base URL and the (non-schema) Sessions API shape from the contract.
 *
 * Nothing here opens a network connection at import time — callers invoke the
 * fetch helpers explicitly, and the SSE `EventSource` lives in `useEventStream`.
 */

/** Session metadata returned by `GET /sessions` (see docs/CONTRACT.md). */
export interface SessionMeta {
  id: string;
  agent: string;
  /** ts of the session's first event. */
  startedAt: number;
  eventCount: number;
  /** ts of the session's latest event. */
  lastTs: number;
}

const DEFAULT_SERVER = 'http://127.0.0.1:4317';

/** Resolve the server base URL from Vite env, falling back to the contract default. */
export function serverUrl(): string {
  const fromEnv = import.meta.env.VITE_AGENT_UI_SERVER;
  return (typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : DEFAULT_SERVER).replace(
    /\/$/,
    '',
  );
}

/** Build the SSE stream URL for a session (or the most-recent session when omitted). */
export function streamUrl(session?: string, base: string = serverUrl()): string {
  return session ? `${base}/stream?session=${encodeURIComponent(session)}` : `${base}/stream`;
}

function isSessionMeta(value: unknown): value is SessionMeta {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.agent === 'string' &&
    typeof v.startedAt === 'number' &&
    typeof v.eventCount === 'number' &&
    typeof v.lastTs === 'number'
  );
}

/** Fetch the session list from `GET /sessions`, already sorted by `lastTs` desc by the server. */
export async function fetchSessions(
  base: string = serverUrl(),
  signal?: AbortSignal,
): Promise<SessionMeta[]> {
  const res = await fetch(`${base}/sessions`, { signal });
  if (!res.ok) {
    throw new Error(`GET /sessions failed: ${res.status}`);
  }
  const body: unknown = await res.json();
  if (!Array.isArray(body)) {
    throw new Error('GET /sessions: expected an array');
  }
  return body.filter(isSessionMeta);
}
