import { describe, expect, it } from 'vitest';
import { makeEvent } from '../src/make-event.js';
import { validate } from '../src/validate.js';

describe('makeEvent', () => {
  it('fills v=1, a fresh id, and ts=now', () => {
    const before = Date.now();
    const event = makeEvent({
      session: 's1',
      seq: 0,
      agent: 'claude-code',
      type: 'message',
      data: { role: 'assistant', text: 'hi' },
    });
    const after = Date.now();

    expect(event.v).toBe(1);
    expect(typeof event.id).toBe('string');
    expect(event.id).toHaveLength(21);
    expect(event.ts).toBeGreaterThanOrEqual(before);
    expect(event.ts).toBeLessThanOrEqual(after);
    expect(validate(event)).toEqual(event);
  });

  it('preserves caller-provided fields', () => {
    const event = makeEvent({
      session: 's2',
      seq: 7,
      agent: 'codex',
      type: 'command',
      data: { cmd: 'ls', exitCode: 0 },
    });
    expect(event.session).toBe('s2');
    expect(event.seq).toBe(7);
    expect(event.agent).toBe('codex');
    expect(event.type).toBe('command');
    expect(event.data).toEqual({ cmd: 'ls', exitCode: 0 });
  });

  it('lets the caller override id and ts (e.g. for replay)', () => {
    const event = makeEvent({
      id: 'fixed-id',
      ts: 123,
      session: 's3',
      seq: 1,
      agent: 'claude-code',
      type: 'session_start',
      data: {},
    });
    expect(event.id).toBe('fixed-id');
    expect(event.ts).toBe(123);
  });

  it('generates unique ids', () => {
    const ids = new Set(
      Array.from({ length: 1000 }, () =>
        makeEvent({ session: 's', seq: 0, agent: 'x', type: 'session_end', data: {} }).id,
      ),
    );
    expect(ids.size).toBe(1000);
  });
});
