/**
 * Public surface of the dashboard. Composes the live SSE stream
 * (`useEventStream`) with purely presentational components that take their data
 * via props, so each can be rendered/tested in isolation with fixture events.
 */
export const UI_VERSION = '0.1.0';

// App shell.
export { App } from './App.js';
export type { AppProps } from './App.js';

// Presentational components.
export { Timeline } from './components/Timeline.js';
export type { TimelineProps } from './components/Timeline.js';
export { EventRow } from './components/EventRow.js';
export type { EventRowProps } from './components/EventRow.js';
export { EventDetail } from './components/EventDetail.js';
export { FileEditDetail } from './components/FileEditDetail.js';
export { CommandDetail } from './components/CommandDetail.js';
export { MessageBubble } from './components/MessageBubble.js';
export { ToolDetail } from './components/ToolDetail.js';
export { TokenMeter } from './components/TokenMeter.js';
export { SessionSwitcher } from './components/SessionSwitcher.js';
export type { SessionSwitcherProps } from './components/SessionSwitcher.js';
export { FilterBar } from './components/FilterBar.js';
export type { FilterBarProps } from './components/FilterBar.js';

// Live stream hook.
export { useEventStream } from './hooks/useEventStream.js';
export type { EventStream, StreamStatus } from './hooks/useEventStream.js';

// Pure helpers.
export { sumTokens } from './lib/totals.js';
export type { TokenTotals } from './lib/totals.js';
export {
  summarize,
  relativeTime,
  clockTime,
  formatUsd,
  parseDiff,
  prettyJson,
  TYPE_LABELS,
  TYPE_ICONS,
  TYPE_ACCENTS,
} from './lib/format.js';
export type { DiffLine } from './lib/format.js';
export { applyFilter, matchesFilter, EMPTY_FILTER } from './lib/filter.js';
export type { EventFilter } from './lib/filter.js';
export { serverUrl, streamUrl, fetchSessions } from './lib/server.js';
export type { SessionMeta } from './lib/server.js';
