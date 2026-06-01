import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentEvent } from '@agent-ui/core';
import type { SessionMeta, Store } from './store.js';

/** Filesystem-safe encoding of a session id, so ids with `/` etc. stay one file. */
function sessionToFile(session: string): string {
  return `${encodeURIComponent(session)}.jsonl`;
}

function fileToSession(file: string): string | undefined {
  if (!file.endsWith('.jsonl')) return undefined;
  return decodeURIComponent(file.slice(0, -'.jsonl'.length));
}

interface SessionState {
  meta: SessionMeta;
  /** All events for the session, kept ordered by seq. */
  events: AgentEvent[];
}

/**
 * Append-only JSONL store: one file per session under `dataDir`, plus an
 * in-memory index/cache so reads never re-parse the disk. Existing files in
 * `dataDir` are loaded on construction so the server survives restarts.
 */
export class JsonlStore implements Store {
  private readonly dataDir: string;
  private readonly sessions = new Map<string, SessionState>();
  /** Cache of append file descriptors, keyed by session. */
  private readonly fds = new Map<string, number>();

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    mkdirSync(this.dataDir, { recursive: true });
    this.loadExisting();
  }

  private loadExisting(): void {
    let entries: string[];
    try {
      entries = readdirSync(this.dataDir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const session = fileToSession(entry);
      if (session === undefined) continue;
      const full = join(this.dataDir, entry);
      let raw: string;
      try {
        raw = readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (trimmed === '') continue;
        try {
          const event = JSON.parse(trimmed) as AgentEvent;
          this.index(event);
        } catch {
          // Skip malformed lines rather than crash on a corrupt file.
        }
      }
    }
  }

  /** Update the in-memory index/cache for one event (no disk write). */
  private index(event: AgentEvent): void {
    const existing = this.sessions.get(event.session);
    if (existing === undefined) {
      this.sessions.set(event.session, {
        meta: {
          id: event.session,
          agent: event.agent,
          startedAt: event.ts,
          eventCount: 1,
          lastTs: event.ts,
        },
        events: [event],
      });
      return;
    }

    existing.events.push(event);
    existing.meta.eventCount += 1;
    if (event.ts < existing.meta.startedAt) existing.meta.startedAt = event.ts;
    if (event.ts >= existing.meta.lastTs) {
      existing.meta.lastTs = event.ts;
      // The latest event (by ts) wins for the displayed agent.
      existing.meta.agent = event.agent;
    }
  }

  private fdFor(session: string): number {
    const cached = this.fds.get(session);
    if (cached !== undefined) return cached;
    const path = join(this.dataDir, sessionToFile(session));
    const fd = openSync(path, 'a');
    this.fds.set(session, fd);
    return fd;
  }

  append(event: AgentEvent): void {
    const fd = this.fdFor(event.session);
    writeSync(fd, `${JSON.stringify(event)}\n`);
    this.index(event);
  }

  getEvents(session: string, afterSeq?: number): AgentEvent[] {
    const state = this.sessions.get(session);
    if (state === undefined) return [];
    const sorted = [...state.events].sort((a, b) => a.seq - b.seq);
    if (afterSeq === undefined) return sorted;
    return sorted.filter((event) => event.seq > afterSeq);
  }

  listSessions(): SessionMeta[] {
    return [...this.sessions.values()]
      .map((state) => ({ ...state.meta }))
      .sort((a, b) => b.lastTs - a.lastTs);
  }

  getSession(id: string): SessionMeta | undefined {
    const state = this.sessions.get(id);
    return state === undefined ? undefined : { ...state.meta };
  }

  close(): void {
    for (const fd of this.fds.values()) {
      try {
        closeSync(fd);
      } catch {
        // Best-effort close.
      }
    }
    this.fds.clear();
  }
}

/** Convenience factory mirroring the SQLite one. */
export function createJsonlStore(dataDir: string): JsonlStore {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  return new JsonlStore(dataDir);
}
