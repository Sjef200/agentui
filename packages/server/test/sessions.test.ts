import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { SqliteStore } from '../src/store-sqlite.js';
import type { SessionMeta, Store } from '../src/store.js';
import { readFixture } from './helpers.js';

describe('Sessions API', () => {
  let app: FastifyInstance;
  let store: Store;

  beforeEach(async () => {
    store = new SqliteStore(':memory:');
    app = buildServer({ store });
    await app.ready();

    const events = readFixture('claude-code-basic.jsonl');
    const res = await app.inject({ method: 'POST', url: '/ingest', payload: events });
    expect(res.statusCode).toBe(200);
  });

  afterEach(async () => {
    await app.close();
    store.close();
  });

  it('GET /sessions returns correct metadata', async () => {
    const res = await app.inject({ method: 'GET', url: '/sessions' });
    expect(res.statusCode).toBe(200);
    const sessions = res.json() as SessionMeta[];
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toEqual({
      id: 'sess-cc-basic',
      agent: 'claude-code',
      startedAt: 1780272000000,
      eventCount: 12,
      lastTs: 1780272012550,
    });
  });

  it('GET /sessions is sorted by lastTs desc across multiple sessions', async () => {
    // Add a second, more recent session.
    await app.inject({ method: 'POST', url: '/ingest', payload: readFixture('codex-basic.jsonl') });
    const res = await app.inject({ method: 'GET', url: '/sessions' });
    const sessions = res.json() as SessionMeta[];
    expect(sessions.map((s) => s.id)).toEqual(['sess-codex-basic', 'sess-cc-basic']);
  });

  it('GET /sessions/:id returns one meta', async () => {
    const res = await app.inject({ method: 'GET', url: '/sessions/sess-cc-basic' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: 'sess-cc-basic', agent: 'claude-code', eventCount: 12 });
  });

  it('GET /sessions/:id returns 404 for an unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/sessions/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not found' });
  });

  it('GET /healthz returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
