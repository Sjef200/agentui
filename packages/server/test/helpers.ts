import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validate, type AgentEvent } from '@agent-ui/core';

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the repo's `fixtures/` dir (two levels up from packages/server). */
export const FIXTURES_DIR = join(here, '..', '..', '..', 'fixtures');

/** Read a JSONL fixture into validated, in-order {@link AgentEvent}s. */
export function readFixture(name: string): AgentEvent[] {
  const raw = readFileSync(join(FIXTURES_DIR, name), 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => validate(JSON.parse(line)));
}

/** One parsed SSE message: its `id:` (if any) and concatenated `data:` lines. */
export interface SseMessage {
  id?: string;
  data: string;
}

/**
 * Incrementally parse an SSE byte stream into messages. Heartbeat comment lines
 * (`: ping`) and the leading `retry:` field are ignored; each blank-line-
 * terminated block with a `data:` becomes one {@link SseMessage}.
 */
export class SseParser {
  private buffer = '';
  private readonly messages: SseMessage[] = [];
  /** `retry:` value seen at stream start, if any. */
  public retry: number | undefined;

  push(chunk: string): SseMessage[] {
    this.buffer += chunk;
    const emitted: SseMessage[] = [];
    let idx: number;
    while ((idx = this.buffer.indexOf('\n\n')) !== -1) {
      const block = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      const msg = this.parseBlock(block);
      if (msg !== undefined) {
        this.messages.push(msg);
        emitted.push(msg);
      }
    }
    return emitted;
  }

  private parseBlock(block: string): SseMessage | undefined {
    let id: string | undefined;
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith(':')) continue; // comment / heartbeat
      if (line.startsWith('id:')) {
        id = line.slice('id:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).replace(/^ /, ''));
      } else if (line.startsWith('retry:')) {
        const parsed = Number.parseInt(line.slice('retry:'.length).trim(), 10);
        if (Number.isFinite(parsed)) this.retry = parsed;
      }
    }
    if (dataLines.length === 0) return undefined;
    return { id, data: dataLines.join('\n') };
  }

  all(): SseMessage[] {
    return this.messages;
  }
}

/**
 * Connect to an SSE endpoint and resolve once `count` data messages have been
 * received (or `signal` aborts). Returns the parser so callers can inspect ids,
 * retry, and decoded events.
 */
export async function collectSse(
  url: string,
  count: number,
  init: RequestInit = {},
): Promise<SseParser> {
  const res = await fetch(url, { ...init, headers: { Accept: 'text/event-stream', ...init.headers } });
  if (res.body === null) throw new Error('SSE response had no body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();

  try {
    while (parser.all().length < count) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return parser;
}

/** Decode an {@link SseMessage}'s data back into an {@link AgentEvent}. */
export function decodeEvent(msg: SseMessage): AgentEvent {
  return JSON.parse(msg.data) as AgentEvent;
}
