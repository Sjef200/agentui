import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AgentEvent } from '@agent-ui/core';
import type { Store } from '../src/store.js';
import { JsonlStore } from '../src/store-jsonl.js';
import { SqliteStore } from '../src/store-sqlite.js';

function ev(
  session: string,
  seq: number,
  ts: number,
  agent: string,
  text: string,
): AgentEvent {
  return {
    v: 1,
    id: `${session}-${seq}`,
    session,
    seq,
    ts,
    agent,
    type: 'message',
    data: { role: 'assistant', text },
  };
}

interface Backend {
  name: string;
  /** Construct a fresh store + a cleanup. */
  make(): { store: Store; cleanup: () => void };
}

const backends: Backend[] = [
  {
    name: 'jsonl',
    make() {
      const dir = mkdtempSync(join(tmpdir(), 'aui-jsonl-'));
      const store = new JsonlStore(dir);
      return { store, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
    },
  },
  {
    name: 'sqlite (:memory:)',
    make() {
      const store = new SqliteStore(':memory:');
      return { store, cleanup: () => store.close() };
    },
  },
  {
    name: 'sqlite (file)',
    make() {
      const dir = mkdtempSync(join(tmpdir(), 'aui-sqlite-'));
      const store = new SqliteStore(join(dir, 'events.db'));
      return {
        store,
        cleanup: () => {
          store.close();
          rmSync(dir, { recursive: true, force: true });
        },
      };
    },
  },
];

describe.each(backends)('Store backend: $name', (backend) => {
  let store: Store;
  let cleanup: () => void;

  beforeEach(() => {
    const made = backend.make();
    store = made.store;
    cleanup = made.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('append + getEvents returns events ordered by seq', () => {
    // Insert out of order; expect ordered output.
    store.append(ev('s1', 2, 300, 'claude-code', 'third'));
    store.append(ev('s1', 0, 100, 'claude-code', 'first'));
    store.append(ev('s1', 1, 200, 'claude-code', 'second'));

    const events = store.getEvents('s1');
    expect(events.map((e) => e.seq)).toEqual([0, 1, 2]);
    expect(events.map((e) => (e.type === 'message' ? e.data.text : ''))).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('getEvents honors afterSeq (only seq > afterSeq)', () => {
    for (let i = 0; i < 5; i++) store.append(ev('s1', i, 100 + i, 'codex', `m${i}`));

    expect(store.getEvents('s1', 2).map((e) => e.seq)).toEqual([3, 4]);
    expect(store.getEvents('s1', 4).map((e) => e.seq)).toEqual([]);
    // afterSeq of 0 must exclude seq 0 but include the rest.
    expect(store.getEvents('s1', 0).map((e) => e.seq)).toEqual([1, 2, 3, 4]);
  });

  it('getEvents for an unknown session is empty', () => {
    expect(store.getEvents('nope')).toEqual([]);
  });

  it('listSessions sorted by lastTs desc with correct metadata', () => {
    store.append(ev('a', 0, 1000, 'claude-code', 'a0'));
    store.append(ev('a', 1, 1500, 'claude-code', 'a1'));
    store.append(ev('b', 0, 2000, 'codex', 'b0'));
    store.append(ev('c', 0, 500, 'cline', 'c0'));

    const sessions = store.listSessions();
    expect(sessions.map((s) => s.id)).toEqual(['b', 'a', 'c']);

    const a = sessions.find((s) => s.id === 'a');
    expect(a).toMatchObject({ id: 'a', agent: 'claude-code', startedAt: 1000, eventCount: 2, lastTs: 1500 });
    const b = sessions.find((s) => s.id === 'b');
    expect(b).toMatchObject({ id: 'b', agent: 'codex', startedAt: 2000, eventCount: 1, lastTs: 2000 });
  });

  it('getSession returns one meta or undefined', () => {
    store.append(ev('only', 0, 42, 'opencode', 'hi'));
    expect(store.getSession('only')).toMatchObject({
      id: 'only',
      agent: 'opencode',
      startedAt: 42,
      eventCount: 1,
      lastTs: 42,
    });
    expect(store.getSession('missing')).toBeUndefined();
  });
});
