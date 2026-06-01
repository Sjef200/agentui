import type { AgentEvent } from '@agent-ui/core';

/** Aggregated token/cost totals across a session's `token_usage` events. */
export interface TokenTotals {
  input: number;
  output: number;
  costUsd: number;
  /** Number of token_usage events summed (lets the UI show "no data yet"). */
  samples: number;
}

/** Sum input/output tokens and USD cost across every `token_usage` event. Pure. */
export function sumTokens(events: readonly AgentEvent[]): TokenTotals {
  const totals: TokenTotals = { input: 0, output: 0, costUsd: 0, samples: 0 };
  for (const event of events) {
    if (event.type !== 'token_usage') continue;
    totals.input += event.data.input;
    totals.output += event.data.output;
    totals.costUsd += event.data.costUsd ?? 0;
    totals.samples += 1;
  }
  return totals;
}
