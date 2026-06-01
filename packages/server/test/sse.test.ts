import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { AgentEvent } from '@agent-ui/core';
import { buildServer } from '../src/server.js';
import { collectSse, decodeEvent, readFixture } from './helpers.js';

describe('SSE /stream integration', () => {
  let app: FastifyInstance;
  let dataDir: string;
  let baseUrl: string;

  beforeEach(async () => {
    // Real jsonl backend in a throwaway temp dir, bound to an ephemeral port.
    dataDir = mkdtempSync(join(tmpdir(), 'aui-sse-'));
    app = buildServer({ config: { store: 'jsonl', dataDir, port: 0, host: '127.0.0.1' } });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterEach(async () => {
    await app.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  async function ingest(events: AgentEvent[]): Promise<void> {
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    });
    expect(res.status).toBe(200);
  }

  it('replays stored events in seq order, with retry and seq ids', async () => {
    const events = readFixture('claude-code-basic.jsonl');
    // POST each event individually to exercise the per-event ingest path.
    for (const event of events) await ingest([event]);

    const parser = await collectSse(`${baseUrl}/stream?session=sess-cc-basic`, events.length);
    const received = parser.all();

    expect(parser.retry).toBe(3000);
    expect(received.map((m) => m.id)).toEqual(events.map((e) => String(e.seq)));
    expect(received.map((m) => decodeEvent(m).seq)).toEqual(events.map((e) => e.seq));
    expect(received.map((m) => decodeEvent(m).id)).toEqual(events.map((e) => e.id));
  });

  it('defaults to the most-recently-active session when session is omitted', async () => {
    await ingest(readFixture('claude-code-basic.jsonl')); // lastTs 1780272012550
    await ingest(readFixture('codex-basic.jsonl')); // lastTs 1780274009000 (newer)

    const codex = readFixture('codex-basic.jsonl');
    const parser = await collectSse(`${baseUrl}/stream`, codex.length);
    expect(parser.all().every((m) => decodeEvent(m).session === 'sess-codex-basic')).toBe(true);
  });

  it('streams events live that arrive after the client connects', async () => {
    const events = readFixture('claude-code-basic.jsonl');
    const first = events.slice(0, 4);
    const rest = events.slice(4);
    for (const event of first) await ingest([event]);

    // Connect and wait for all events: 4 replayed + the rest streamed live.
    const collecting = collectSse(`${baseUrl}/stream?session=sess-cc-basic`, events.length);
    // Give the client a tick to subscribe, then ingest the remainder.
    await new Promise((r) => setTimeout(r, 50));
    for (const event of rest) await ingest([event]);

    const parser = await collecting;
    const seqs = parser.all().map((m) => decodeEvent(m).seq);
    expect(seqs).toEqual(events.map((e) => e.seq));
  });

  it('honors Last-Event-ID: replays only events with seq > the given id', async () => {
    const events = readFixture('claude-code-basic.jsonl');
    await ingest(events);

    // Reconnect "after seq 5" — expect seq 6..11 only.
    const remaining = events.filter((e) => e.seq > 5);
    const parser = await collectSse(`${baseUrl}/stream?session=sess-cc-basic`, remaining.length, {
      headers: { 'Last-Event-ID': '5' },
    });

    const seqs = parser.all().map((m) => decodeEvent(m).seq);
    expect(seqs).toEqual(remaining.map((e) => e.seq));
    expect(Math.min(...seqs)).toBe(6);
  });
});
