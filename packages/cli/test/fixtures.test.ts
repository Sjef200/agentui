import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EVENT_TYPES } from '@agent-ui/core';
import type { AgentEvent } from '@agent-ui/core';
import { parseFixture } from '../src/fixtures.js';
import { computeDelays } from '../src/pacing.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures');
const basicPath = join(fixturesDir, 'claude-code-basic.jsonl');

function loadBasic(): { text: string; events: AgentEvent[] } {
  const text = readFileSync(basicPath, 'utf8');
  return { text, events: parseFixture(text) };
}

describe('parseFixture', () => {
  it('parses the basic fixture into validated core events', () => {
    const { events } = loadBasic();
    expect(events.length).toBeGreaterThan(0);
    // Every parsed line is a known event type and shares the schema version.
    for (const event of events) {
      expect(EVENT_TYPES).toContain(event.type);
      expect(event.v).toBe(1);
    }
  });

  it('skips blank lines and a trailing newline', () => {
    const { text, events } = loadBasic();
    const nonBlankLines = text.split('\n').filter((l) => l.trim().length > 0).length;
    expect(events).toHaveLength(nonBlankLines);

    const padded = `\n\n${text}\n   \n`;
    expect(parseFixture(padded)).toHaveLength(events.length);
  });

  it('reports the 1-based line number for invalid JSON', () => {
    // Line 1 is a valid event so parsing reaches line 2, where the JSON is bad.
    const validLine = JSON.stringify({
      v: 1,
      id: 'a',
      session: 's',
      seq: 0,
      ts: 0,
      agent: 'claude-code',
      type: 'message',
      data: { role: 'user', text: 'hi' },
    });
    expect(() => parseFixture(`${validLine}\nnot-json`)).toThrow(/Invalid JSON on line 2/);
  });

  it('reports the 1-based line number for a schema-invalid event', () => {
    // Valid JSON, but not a valid AgentEvent (unknown type, no required fields).
    expect(() => parseFixture('{"type":"telepathy"}')).toThrow(/line 1/);
  });
});

describe('fixture pacing', () => {
  it('maps fixture timestamps to delays of matching length with index 0 = 0', () => {
    const { events } = loadBasic();
    const delays = computeDelays(events.map((e) => e.ts));
    expect(delays).toHaveLength(events.length);
    expect(delays[0]).toBe(0);
  });

  it('produces all non-negative delays bounded by the cap for the real fixture', () => {
    const { events } = loadBasic();
    const delays = computeDelays(events.map((e) => e.ts));
    for (const d of delays) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(2000);
    }
  });

  it('fast mode zeroes the real fixture delays', () => {
    const { events } = loadBasic();
    const delays = computeDelays(
      events.map((e) => e.ts),
      { fast: true },
    );
    expect(delays.every((d) => d === 0)).toBe(true);
  });
});
