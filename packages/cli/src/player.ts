/**
 * The fixture player: reads a fixture, paces it by `ts` deltas, and POSTs each
 * event to the server's `POST /ingest` in order.
 *
 * The pure pacing math lives in `pacing.ts`; this module owns the I/O — the
 * health check, the awaited sleeps (the only place a real clock is used), the
 * network calls (Node 22 global `fetch`), and the console output.
 */

import { setTimeout as sleep } from 'node:timers/promises';
import type { AgentEvent } from '@agent-ui/core';
import { computeDelays } from './pacing.js';
import { loadFixture, resolveFixturePath } from './fixtures.js';

export const DEFAULT_SERVER = 'http://127.0.0.1:4317';

export interface DemoOptions {
  server: string;
  fast: boolean;
  speed: number;
  session?: string;
  /** Working directory used to resolve a bare/relative fixture name. */
  cwd?: string;
}

/** A minimal console surface so the loop is testable without stubbing globals. */
export interface Logger {
  log(message: string): void;
  error(message: string): void;
}

const consoleLogger: Logger = {
  log: (m) => console.log(m),
  error: (m) => console.error(m),
};

/** Probe `GET /healthz`. Returns true only on a `2xx` response. */
export async function checkHealth(server: string): Promise<boolean> {
  try {
    const res = await fetch(new URL('/healthz', server), { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/** A short, single-line human summary of an event for progress output. */
export function summarize(event: AgentEvent): string {
  switch (event.type) {
    case 'session_start':
      return event.data.title ? `"${event.data.title}"` : (event.data.cwd ?? 'session started');
    case 'session_end':
      return event.data.reason ?? 'session ended';
    case 'message':
      return `${event.data.role}: ${truncate(event.data.text)}`;
    case 'tool_call':
      return `${event.data.name}(…)`;
    case 'tool_result':
      return `${event.data.name} → ${event.data.ok ? 'ok' : 'error'}`;
    case 'file_edit':
      return event.data.path;
    case 'command':
      return truncate(event.data.cmd);
    case 'token_usage':
      return `in ${event.data.input} / out ${event.data.output}`;
    case 'error':
      return truncate(event.data.message);
  }
}

function truncate(text: string, max = 60): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

/** POST a single event to `/ingest`; throws with the server's message on failure. */
async function postEvent(server: string, event: AgentEvent): Promise<void> {
  const res = await fetch(new URL('/ingest', server), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`POST /ingest failed: ${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`);
  }
}

export interface DemoResult {
  count: number;
  elapsedMs: number;
}

/**
 * Run the `demo` command end to end. Resolves the fixture, verifies the server
 * is up, then streams events in order with `ts`-derived pacing.
 *
 * Throws on a missing/invalid fixture, a down server, or an ingest failure; the
 * CLI entrypoint maps those to a non-zero exit.
 */
export async function runDemo(
  fixture: string | undefined,
  opts: DemoOptions,
  logger: Logger = consoleLogger,
): Promise<DemoResult> {
  const cwd = opts.cwd ?? process.cwd();
  const path = resolveFixturePath(fixture, cwd);

  let events = await loadFixture(path);
  logger.log(`Loaded ${events.length} event(s) from ${path}`);

  if (opts.session) {
    events = events.map((e) => ({ ...e, session: opts.session as string }));
    logger.log(`Overriding session id → ${opts.session}`);
  }

  if (!(await checkHealth(opts.server))) {
    throw new ServerDownError(opts.server);
  }

  const delays = computeDelays(
    events.map((e) => e.ts),
    { fast: opts.fast, speed: opts.speed },
  );

  const started = Date.now();
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event) continue;

    const delay = delays[i] ?? 0;
    if (delay > 0) await sleep(delay);

    await postEvent(opts.server, event);
    logger.log(`  [${pad(event.seq)}] ${event.type.padEnd(13)} ${summarize(event)}`);
  }

  const elapsedMs = Date.now() - started;
  logger.log(`\nDone. Streamed ${events.length} event(s) in ${(elapsedMs / 1000).toFixed(1)}s.`);
  return { count: events.length, elapsedMs };
}

function pad(seq: number): string {
  return String(seq).padStart(3, ' ');
}

/** Raised when the server health check fails; carries a copy-paste hint. */
export class ServerDownError extends Error {
  constructor(public readonly server: string) {
    super(
      `Cannot reach the agent-ui server at ${server}.\n` +
        '  Start it with: pnpm --filter @agent-ui/server dev',
    );
    this.name = 'ServerDownError';
  }
}
