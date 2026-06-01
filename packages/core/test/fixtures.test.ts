import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validate } from '../src/validate.js';
import type { EventType } from '../src/types.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures');
const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.jsonl'));

function readEvents(file: string): unknown[] {
  return readFileSync(join(fixturesDir, file), 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

const REQUIRED_TYPES: EventType[] = [
  'session_start',
  'message',
  'file_edit',
  'command',
  'token_usage',
  'session_end',
];

describe('fixtures', () => {
  it('ships recorded sessions', () => {
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  describe.each(files)('%s', (file) => {
    const raw = readEvents(file);

    it('every line validates against the core schema', () => {
      expect(raw.length).toBeGreaterThan(0);
      for (const event of raw) {
        expect(() => validate(event)).not.toThrow();
      }
    });

    it('seq is monotonic from 0', () => {
      const seqs = raw.map((e) => validate(e).seq);
      expect(seqs).toEqual(seqs.map((_, i) => i));
    });

    it('timestamps are non-decreasing', () => {
      const ts = raw.map((e) => validate(e).ts);
      for (let i = 1; i < ts.length; i++) {
        expect(ts[i]!).toBeGreaterThanOrEqual(ts[i - 1]!);
      }
    });

    it('covers a realistic session (start, edits, commands, tokens, end)', () => {
      const types = new Set(raw.map((e) => validate(e).type));
      for (const required of REQUIRED_TYPES) {
        expect(types.has(required)).toBe(true);
      }
      const fileEdits = raw.filter((e) => validate(e).type === 'file_edit');
      expect(fileEdits.length).toBeGreaterThanOrEqual(1);
    });

    it('all events in a file share one session id and agent', () => {
      const sessions = new Set(raw.map((e) => validate(e).session));
      const agents = new Set(raw.map((e) => validate(e).agent));
      expect(sessions.size).toBe(1);
      expect(agents.size).toBe(1);
    });
  });
});
