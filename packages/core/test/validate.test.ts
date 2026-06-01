import { describe, expect, it } from 'vitest';
import { isValid, validate } from '../src/validate.js';
import { allSamples, command } from './samples.js';

describe('validate', () => {
  it('accepts a valid event of every type and returns it', () => {
    for (const sample of allSamples) {
      expect(validate(sample)).toEqual(sample);
      expect(isValid(sample)).toBe(true);
    }
  });

  it('rejects an unknown event type', () => {
    const bad = { ...command, type: 'telepathy', data: {} };
    expect(() => validate(bad)).toThrow();
    expect(isValid(bad)).toBe(false);
  });

  it('rejects a missing required data field', () => {
    const bad = { ...command, data: { cwd: '/x' } }; // no `cmd`
    expect(() => validate(bad)).toThrow();
  });

  it('rejects an ill-typed field', () => {
    expect(() => validate({ ...command, seq: 'first' })).toThrow();
    expect(() => validate({ ...command, data: { cmd: 'ls', exitCode: 'zero' } })).toThrow();
  });

  it('rejects the wrong schema version', () => {
    expect(() => validate({ ...command, v: 2 })).toThrow();
  });

  it('rejects message roles outside the enum', () => {
    const bad = {
      ...command,
      type: 'message',
      data: { role: 'system', text: 'hi' },
    };
    expect(() => validate(bad)).toThrow();
  });

  it('rejects non-objects', () => {
    expect(() => validate(null)).toThrow();
    expect(() => validate('event')).toThrow();
    expect(isValid(undefined)).toBe(false);
  });

  it('strips unknown extra keys', () => {
    const parsed = validate({ ...command, extra: 'nope' });
    expect(parsed).not.toHaveProperty('extra');
  });
});
