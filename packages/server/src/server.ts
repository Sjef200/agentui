import type { ServerResponse } from 'node:http';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { redact, validate, type AgentEvent } from '@agent-ui/core';
import { resolveConfig, type ConfigOverrides, type ServerConfig } from './config.js';
import { Hub } from './hub.js';
import type { Store } from './store.js';
import { createStore } from './store-factory.js';

/** The Node response behind `reply.raw`, written to directly for SSE. */
type RawReply = ServerResponse;

/** Options for {@link buildServer}; everything is optional so prod uses env defaults. */
export interface BuildServerOptions {
  /** Inject a Store (tests pass an in-memory/temp one). Defaults to the configured backend. */
  store?: Store;
  /** Config overrides; anything omitted falls back to env then defaults. */
  config?: ConfigOverrides;
}

/** ~15s between SSE heartbeat comments, per CONTRACT.md. */
const HEARTBEAT_MS = 15_000;
/** Client reconnect backoff advertised once at stream start. */
const RETRY_MS = 3000;

interface IngestReply {
  ok: true;
  count: number;
  ids: string[];
}

/** A parsed integer Last-Event-ID, or undefined when absent/non-numeric. */
function parseLastEventId(header: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw === undefined || raw.trim() === '') return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Write one SSE message frame for an event: `id:` then `data:` then a blank line. */
function writeEvent(raw: RawReply, event: AgentEvent): void {
  raw.write(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);
}

/**
 * Build a configured Fastify instance: CORS, ingest, the sessions API, and the
 * SSE stream. The {@link Store} and a {@link Hub} are created from config unless
 * a store is injected (tests). Call `.listen()` on the result, or use
 * `.inject()` for HTTP-only assertions.
 */
export function buildServer(opts: BuildServerOptions = {}): FastifyInstance {
  const config: ServerConfig = resolveConfig(opts.config);
  const store: Store = opts.store ?? createStore(config);
  const hub = new Hub(config.ringCap);

  const app = Fastify({ logger: false });

  // Tie store lifecycle to the server: closing the app releases file/db handles.
  // Only own the store we created; an injected store is the caller's to close.
  if (opts.store === undefined) {
    app.addHook('onClose', async () => {
      store.close();
    });
  }

  // Expose config + store for tests/introspection without re-resolving env.
  app.decorate('config', config);
  app.decorate('store', store);

  void app.register(cors, { origin: true });

  app.get('/healthz', async () => ({ ok: true }));

  app.post('/ingest', async (request, reply) => {
    const body = request.body;
    const raw: unknown[] = Array.isArray(body) ? body : [body];

    // Validate the whole batch first; reject (and store nothing) if any fails.
    const validated: AgentEvent[] = [];
    for (const candidate of raw) {
      try {
        validated.push(validate(candidate));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'invalid event';
        return reply.code(400).send({ error: message });
      }
    }

    const ids: string[] = [];
    for (const event of validated) {
      const clean = redact(event);
      store.append(clean);
      hub.publish(clean);
      ids.push(clean.id);
    }

    const payload: IngestReply = { ok: true, count: ids.length, ids };
    return reply.code(200).send(payload);
  });

  app.get('/sessions', async () => store.listSessions());

  app.get<{ Params: { id: string } }>('/sessions/:id', async (request, reply) => {
    const meta = store.getSession(request.params.id);
    if (meta === undefined) return reply.code(404).send({ error: 'not found' });
    return meta;
  });

  app.get<{ Querystring: { session?: string } }>('/stream', async (request, reply) => {
    // Resolve the target session: explicit query, else most-recently-active.
    const requested = request.query.session;
    const session =
      requested !== undefined && requested !== ''
        ? requested
        : store.listSessions()[0]?.id;

    reply.hijack();
    const out = reply.raw;
    out.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      // Defeat proxy buffering so events flush immediately.
      'X-Accel-Buffering': 'no',
    });
    out.write(`retry: ${RETRY_MS}\n\n`);

    // Track the highest seq we've emitted so live events never duplicate replay.
    const afterSeq = parseLastEventId(request.headers['last-event-id']);
    let lastSeq = afterSeq ?? -1;

    if (session !== undefined) {
      for (const event of store.getEvents(session, afterSeq)) {
        writeEvent(out, event);
        if (event.seq > lastSeq) lastSeq = event.seq;
      }
    }

    // Go live. With no resolved session there is nothing to subscribe to yet,
    // so we hold the connection open (heartbeats only) until the client picks one.
    let unsubscribe: (() => void) | undefined;
    if (session !== undefined) {
      unsubscribe = hub.subscribe(session, (event) => {
        if (event.seq <= lastSeq) return;
        writeEvent(out, event);
        lastSeq = event.seq;
      });
    }

    const heartbeat = setInterval(() => {
      out.write(': ping\n\n');
    }, HEARTBEAT_MS);
    // Don't keep the event loop (or test process) alive for heartbeats alone.
    if (typeof heartbeat.unref === 'function') heartbeat.unref();

    const cleanup = (): void => {
      clearInterval(heartbeat);
      if (unsubscribe !== undefined) unsubscribe();
    };
    request.raw.on('close', cleanup);
    out.on('close', cleanup);
  });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: ServerConfig;
    store: Store;
  }
}
