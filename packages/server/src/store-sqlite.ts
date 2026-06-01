import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { AgentEvent } from '@agent-ui/core';
import type { SessionMeta, Store } from './store.js';

interface EventRow {
  json: string;
}

interface SessionRow {
  id: string;
  agent: string;
  startedAt: number;
  eventCount: number;
  lastTs: number;
}

/**
 * SQLite-backed store via better-sqlite3 (synchronous, perfect for this
 * request-scoped API). `dbPath` is either a file path (its parent dir is
 * created) or the literal `':memory:'` for an ephemeral in-process db.
 */
export class SqliteStore implements Store {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') {
      const dir = dirname(dbPath);
      if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        agent TEXT NOT NULL,
        startedAt INTEGER NOT NULL,
        eventCount INTEGER NOT NULL DEFAULT 0,
        lastTs INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        session TEXT NOT NULL,
        seq INTEGER NOT NULL,
        ts INTEGER NOT NULL,
        json TEXT NOT NULL,
        PRIMARY KEY (session, seq)
      );
      CREATE INDEX IF NOT EXISTS idx_events_session_seq ON events (session, seq);
    `);
  }

  append(event: AgentEvent): void {
    const json = JSON.stringify(event);
    const tx = this.db.transaction((e: AgentEvent, payload: string) => {
      this.db
        .prepare(
          `INSERT OR REPLACE INTO events (session, seq, ts, json) VALUES (@session, @seq, @ts, @json)`,
        )
        .run({ session: e.session, seq: e.seq, ts: e.ts, json: payload });

      this.db
        .prepare(
          `INSERT INTO sessions (id, agent, startedAt, eventCount, lastTs)
             VALUES (@id, @agent, @ts, 1, @ts)
           ON CONFLICT(id) DO UPDATE SET
             eventCount = eventCount + 1,
             startedAt = MIN(startedAt, excluded.startedAt),
             lastTs = MAX(lastTs, excluded.lastTs),
             agent = CASE WHEN excluded.lastTs >= lastTs THEN excluded.agent ELSE agent END`,
        )
        .run({ id: e.session, agent: e.agent, ts: e.ts });
    });
    tx(event, json);
  }

  getEvents(session: string, afterSeq?: number): AgentEvent[] {
    const after = afterSeq ?? -1;
    const rows = this.db
      .prepare(`SELECT json FROM events WHERE session = ? AND seq > ? ORDER BY seq`)
      .all(session, after) as EventRow[];
    return rows.map((row) => JSON.parse(row.json) as AgentEvent);
  }

  listSessions(): SessionMeta[] {
    const rows = this.db
      .prepare(
        `SELECT id, agent, startedAt, eventCount, lastTs FROM sessions ORDER BY lastTs DESC`,
      )
      .all() as SessionRow[];
    return rows.map((row) => ({ ...row }));
  }

  getSession(id: string): SessionMeta | undefined {
    const row = this.db
      .prepare(`SELECT id, agent, startedAt, eventCount, lastTs FROM sessions WHERE id = ?`)
      .get(id) as SessionRow | undefined;
    return row === undefined ? undefined : { ...row };
  }

  close(): void {
    this.db.close();
  }
}

/** Convenience factory. */
export function createSqliteStore(dbPath: string): SqliteStore {
  return new SqliteStore(dbPath);
}
