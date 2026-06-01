import { EVENT_TYPES, type EventType } from '@agent-ui/core';
import { TYPE_LABELS, TYPE_ICONS, TYPE_ACCENTS } from '../lib/format.js';
import type { EventFilter } from '../lib/filter.js';

export interface FilterBarProps {
  filter: EventFilter;
  onChange: (filter: EventFilter) => void;
  /** Optional per-type counts to show on chips. */
  counts?: Partial<Record<EventType, number>>;
}

/**
 * Client-side filter controls: a free-text input plus per-type toggle chips
 * over {@link EVENT_TYPES}. Controlled — state lives in the parent.
 */
export function FilterBar({ filter, onChange, counts }: FilterBarProps): JSX.Element {
  const toggleType = (type: EventType): void => {
    const next = new Set(filter.enabledTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange({ ...filter, enabledTypes: next });
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        aria-label="Filter events"
        placeholder="Filter events…"
        value={filter.text}
        onChange={(e) => onChange({ ...filter, text: e.target.value })}
        className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none"
      />
      <div className="flex flex-wrap gap-1.5">
        {EVENT_TYPES.map((type) => {
          // Empty set = all enabled; otherwise active iff in the set.
          const active = filter.enabledTypes.size === 0 || filter.enabledTypes.has(type);
          const count = counts?.[type];
          return (
            <button
              key={type}
              type="button"
              aria-pressed={filter.enabledTypes.has(type)}
              data-type={type}
              onClick={() => toggleType(type)}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                active
                  ? 'border-zinc-600 bg-zinc-800 text-zinc-200'
                  : 'border-zinc-800 bg-transparent text-zinc-600'
              }`}
            >
              <span aria-hidden="true" className={active ? TYPE_ACCENTS[type] : ''}>
                {TYPE_ICONS[type]}
              </span>
              <span>{TYPE_LABELS[type]}</span>
              {count !== undefined && <span className="tabular-nums text-zinc-500">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
