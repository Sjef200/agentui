import { describe, expect, it } from 'vitest';
import type { AgentEvent } from '@agent-ui/core';
import { DEFAULT_SERVER, ServerDownError, summarize } from '../src/player.js';

const base = {
  v: 1 as const,
  id: 'x',
  session: 's',
  seq: 0,
  ts: 0,
  agent: 'claude-code',
};

describe('summarize', () => {
  it('produces a one-line summary for every event type', () => {
    const samples: AgentEvent[] = [
      { ...base, type: 'session_start', data: { title: 'Fix the bug', cwd: '/repo' } },
      { ...base, type: 'session_end', data: { reason: 'done' } },
      { ...base, type: 'message', data: { role: 'assistant', text: 'hello world' } },
      { ...base, type: 'tool_call', data: { name: 'Read' } },
      { ...base, type: 'tool_result', data: { name: 'Read', ok: false } },
      { ...base, type: 'file_edit', data: { path: 'src/a.ts' } },
      { ...base, type: 'command', data: { cmd: 'pnpm test' } },
      { ...base, type: 'token_usage', data: { input: 10, output: 20 } },
      { ...base, type: 'error', data: { message: 'boom' } },
    ];
    for (const event of samples) {
      const line = summarize(event);
      expect(typeof line).toBe('string');
      expect(line.length).toBeGreaterThan(0);
      expect(line).not.toContain('\n');
    }
  });

  it('prefers the title for session_start and reflects tool_result status', () => {
    expect(summarize({ ...base, type: 'session_start', data: { title: 'T', cwd: '/c' } })).toContain(
      'T',
    );
    expect(
      summarize({ ...base, type: 'tool_result', data: { name: 'Read', ok: true } }),
    ).toContain('ok');
    expect(
      summarize({ ...base, type: 'tool_result', data: { name: 'Read', ok: false } }),
    ).toContain('error');
  });

  it('collapses whitespace and truncates long text to a single line', () => {
    const long = 'a'.repeat(200);
    const line = summarize({ ...base, type: 'message', data: { role: 'user', text: long } });
    expect(line).not.toContain('\n');
    expect(line.length).toBeLessThan(long.length);
  });
});

describe('ServerDownError', () => {
  it('carries the server URL and a copy-paste start hint', () => {
    const err = new ServerDownError(DEFAULT_SERVER);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ServerDownError');
    expect(err.server).toBe(DEFAULT_SERVER);
    expect(err.message).toContain(DEFAULT_SERVER);
    expect(err.message).toContain('pnpm --filter @agent-ui/server dev');
  });

  it('exposes the contract default server URL', () => {
    expect(DEFAULT_SERVER).toBe('http://127.0.0.1:4317');
  });
});
