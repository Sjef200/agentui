import type { AgentEvent } from '@agent-ui/core';
import {
  TYPE_LABELS,
  TYPE_ICONS,
  TYPE_ACCENTS,
  relativeTime,
  clockTime,
  summarize,
} from '../lib/format.js';
import { EventDetail } from './EventDetail.js';

export interface EventRowProps {
  event: AgentEvent;
  expanded: boolean;
  onToggle: (id: string) => void;
  /** "now" reference for relative timestamps; injectable for deterministic tests. */
  now?: number;
}

/**
 * A single timeline row: type icon + label + one-line summary + relative time.
 * Clicking toggles an inline {@link EventDetail}. Purely presentational.
 */
export function EventRow({ event, expanded, onToggle, now }: EventRowProps): JSX.Element {
  const accent = TYPE_ACCENTS[event.type];
  return (
    <div className="border-b border-zinc-800/60">
      <button
        type="button"
        onClick={() => onToggle(event.id)}
        aria-expanded={expanded}
        data-type={event.type}
        data-event-id={event.id}
        className="flex w-full items-baseline gap-3 px-4 py-2 text-left hover:bg-zinc-800/40 focus:bg-zinc-800/50 focus:outline-none"
      >
        <span className={`shrink-0 text-sm leading-5 ${accent}`} aria-hidden="true">
          {TYPE_ICONS[event.type]}
        </span>
        <span className={`shrink-0 text-xs font-medium tabular-nums ${accent}`}>
          {TYPE_LABELS[event.type]}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">{summarize(event)}</span>
        <span
          className="shrink-0 text-xs tabular-nums text-zinc-500"
          title={clockTime(event.ts)}
        >
          {relativeTime(event.ts, now)}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-zinc-800/40 bg-zinc-900/40 px-4 py-3">
          <EventDetail event={event} />
        </div>
      )}
    </div>
  );
}
