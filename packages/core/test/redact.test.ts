import { afterEach, describe, expect, it } from 'vitest';
import { redact } from '../src/redact.js';
import type { AgentEventOfType } from '../src/types.js';

function commandWith(stdout: string): AgentEventOfType<'command'> {
  return {
    v: 1,
    id: 'c1',
    session: 's1',
    seq: 0,
    ts: 1,
    agent: 'claude-code',
    type: 'command',
    data: { cmd: 'env', stdout },
  };
}

describe('redact', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('masks common token patterns', () => {
    const event = commandWith(
      [
        'openai sk-abcdefghijklmnopqrstuvwxyz0123',
        'github ghp_0123456789abcdefghijklmnopqrstuvwx',
        'aws AKIAIOSFODNN7EXAMPLE',
        'auth: Bearer eyJ.payload.signature and more',
      ].join('\n'),
    );
    const out = redact(event);
    const text = out.data.stdout!;
    expect(text).not.toContain('sk-abcdefghijklmnopqrstuvwxyz0123');
    expect(text).not.toContain('ghp_0123456789abcdefghijklmnopqrstuvwx');
    expect(text).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(text).toContain('[REDACTED]');
    // The "Bearer " prefix is kept; only the credential is masked.
    expect(text).toContain('Bearer [REDACTED]');
  });

  it('masks known env var values, including across nested args', () => {
    process.env.MY_SERVICE_TOKEN = 'super-secret-value-123';
    const event: AgentEventOfType<'tool_call'> = {
      v: 1,
      id: 't1',
      session: 's1',
      seq: 0,
      ts: 1,
      agent: 'claude-code',
      type: 'tool_call',
      data: { name: 'Bash', args: { cmd: 'curl -H token:super-secret-value-123 url' } },
    };
    const out = redact(event);
    expect(JSON.stringify(out.data.args)).not.toContain('super-secret-value-123');
    expect(JSON.stringify(out.data.args)).toContain('[REDACTED]');
  });

  it('leaves benign content untouched', () => {
    const event = commandWith('the quick brown fox edits src/main.ts and runs pnpm test');
    const out = redact(event);
    expect(out.data.stdout).toBe('the quick brown fox edits src/main.ts and runs pnpm test');
  });

  it('honors a custom mask and extra patterns', () => {
    const event = commandWith('ticket ABC-12345 closed');
    const out = redact(event, { mask: '***', patterns: [/ABC-\d+/g] });
    expect(out.data.stdout).toBe('ticket *** closed');
  });

  it('scrubs explicit literal values', () => {
    const event = commandWith('password is hunter2-correct-horse');
    const out = redact(event, { envValues: ['hunter2-correct-horse'] });
    expect(out.data.stdout).toBe('password is [REDACTED]');
  });

  it('does not mutate the input event', () => {
    const event = commandWith('sk-abcdefghijklmnopqrstuvwxyz0123');
    const original = structuredClone(event);
    redact(event);
    expect(event).toEqual(original);
  });

  it('is a no-op when disabled', () => {
    const event = commandWith('sk-abcdefghijklmnopqrstuvwxyz0123');
    const out = redact(event, { enabled: false });
    expect(out).toBe(event);
  });
});
