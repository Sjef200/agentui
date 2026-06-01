import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { AgentEvent } from '@agent-ui/core';
import { buildServer } from '../src/server.js';
import { SqliteStore } from '../src/store-sqlite.js';
import type { Store } from '../src/store.js';

function msg(session: string, seq: number, text: string): AgentEvent {
  return {
    v: 1,
    id: `${session}-${seq}`,
    session,
    seq,
    ts: 1000 + seq,
    agent: 'claude-code',
    type: 'message',
    data: { role: 'user', text },
  };
}

describe('POST /ingest', () => {
  let app: FastifyInstance;
  let store: Store;

  beforeEach(async () => {
    store = new SqliteStore(':memory:');
    app = buildServer({ store });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    store.close();
  });

  it('accepts a single valid event (200) and it becomes retrievable', async () => {
    const res = await app.inject({ method: 'POST', url: '/ingest', payload: msg('s', 0, 'hello') });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, count: 1, ids: ['s-0'] });

    expect(store.getEvents('s').map((e) => e.id)).toEqual(['s-0']);
  });

  it('accepts an array of valid events and reports all ids', async () => {
    const batch = [msg('s', 0, 'a'), msg('s', 1, 'b'), msg('s', 2, 'c')];
    const res = await app.inject({ method: 'POST', url: '/ingest', payload: batch });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, count: 3, ids: ['s-0', 's-1', 's-2'] });
    expect(store.getEvents('s')).toHaveLength(3);
  });

  it('rejects an invalid event with 400 and stores nothing', async () => {
    // Missing `data.text` for a message -> schema failure.
    const bad = { ...msg('s', 0, 'x'), data: { role: 'user' } };
    const res = await app.inject({ method: 'POST', url: '/ingest', payload: bad });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toHaveProperty('error');
    expect(store.getEvents('s')).toEqual([]);
  });

  it('rejects the whole batch (stores nothing) if any event is invalid', async () => {
    const batch = [msg('s', 0, 'ok'), { ...msg('s', 1, 'bad'), type: 'not_a_type' }, msg('s', 2, 'ok')];
    const res = await app.inject({ method: 'POST', url: '/ingest', payload: batch });
    expect(res.statusCode).toBe(400);
    // Nothing from the batch should have been persisted.
    expect(store.getEvents('s')).toEqual([]);
    expect(store.listSessions()).toEqual([]);
  });
});
