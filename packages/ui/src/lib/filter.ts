import type { AgentEvent, EventType } from '@agent-ui/core';
import { TYPE_LABELS, summarize } from './format.js';

export interface EventFilter {
  /** Free-text query; matched case-insensitively against type label + summary. */
  text: string;
  /**
   * Enabled event types. An event passes if its type is in the set. An empty
   * set means "all types enabled" (no type narrowing applied).
   */
  enabledTypes: ReadonlySet<EventType>;
}

/** A filter that lets everything through. */
export const EMPTY_FILTER: EventFilter = { text: '', enabledTypes: new Set() };

/** Does a single event pass the filter? Pure. */
export function matchesFilter(event: AgentEvent, filter: EventFilter): boolean {
  if (filter.enabledTypes.size > 0 && !filter.enabledTypes.has(event.type)) {
    return false;
  }
  const q = filter.text.trim().toLowerCase();
  if (q.length === 0) return true;
  const haystack = `${TYPE_LABELS[event.type]} ${summarize(event)}`.toLowerCase();
  return haystack.includes(q);
}

/** Filter a list of events, preserving order. Pure. */
export function applyFilter(
  events: readonly AgentEvent[],
  filter: EventFilter,
): AgentEvent[] {
  if (filter.text.trim() === '' && filter.enabledTypes.size === 0) {
    return events.slice();
  }
  return events.filter((e) => matchesFilter(e, filter));
}
