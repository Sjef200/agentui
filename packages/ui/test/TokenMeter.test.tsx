import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TokenMeter } from '../src/components/TokenMeter.js';
import { sumTokens } from '../src/lib/totals.js';
import { loadFixture } from './fixtures.js';

describe('TokenMeter + sumTokens', () => {
  it('sums input/output/cost across multiple token_usage events', () => {
    // Both fixtures together contain two token_usage events.
    const events = [...loadFixture('claude-code-basic.jsonl'), ...loadFixture('claude-code-edit-heavy.jsonl')];
    const tokenEvents = events.filter((e) => e.type === 'token_usage');
    expect(tokenEvents.length).toBeGreaterThanOrEqual(2);

    const totals = sumTokens(events);
    expect(totals.samples).toBe(tokenEvents.length);
    expect(totals.input).toBe(4210 + 9120); // 13330
    expect(totals.output).toBe(980 + 2310); // 3290
    expect(totals.costUsd).toBeCloseTo(0.0123 + 0.0297, 6); // 0.042
  });

  it('renders the summed totals in the meter', () => {
    const events = [...loadFixture('claude-code-basic.jsonl'), ...loadFixture('claude-code-edit-heavy.jsonl')];
    const totals = sumTokens(events);
    render(<TokenMeter totals={totals} />);

    const meter = screen.getByTestId('token-meter');
    expect(meter).toHaveTextContent('13,330');
    expect(meter).toHaveTextContent('3,290');
    expect(meter).toHaveTextContent('$0.04');
  });

  it('shows placeholders when there is no token data', () => {
    render(<TokenMeter totals={sumTokens([])} />);
    const meter = screen.getByTestId('token-meter');
    expect(meter).toHaveTextContent('—');
  });
});
