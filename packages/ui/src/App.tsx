import { useEffect, useMemo, useState } from 'react';
import type { AgentEvent, EventType } from '@agent-ui/core';
import { Timeline } from './components/Timeline.js';
import { TokenMeter } from './components/TokenMeter.js';
import { SessionSwitcher } from './components/SessionSwitcher.js';
import { FilterBar } from './components/FilterBar.js';
import { useEventStream } from './hooks/useEventStream.js';
import { fetchSessions, type SessionMeta } from './lib/server.js';
import { sumTokens } from './lib/totals.js';
import { applyFilter, EMPTY_FILTER, type EventFilter } from './lib/filter.js';

export interface AppProps {
  /**
   * Inject events directly (tests, storybook). When provided, the live SSE
   * stream is NOT opened and these events drive the UI instead.
   */
  events?: readonly AgentEvent[];
  /** Inject the session list (tests); otherwise fetched from `GET /sessions`. */
  sessions?: readonly SessionMeta[];
  /** "now" reference for relative timestamps. */
  now?: number;
}

/**
 * The dashboard shell. Owns session selection, the live stream, and the
 * client-side filter; hands plain data to presentational components.
 */
export function App({ events: injectedEvents, sessions: injectedSessions, now }: AppProps): JSX.Element {
  const live = injectedEvents !== undefined;

  const [sessions, setSessions] = useState<readonly SessionMeta[]>(injectedSessions ?? []);
  const [session, setSession] = useState<string | undefined>(
    injectedSessions?.[0]?.id ?? undefined,
  );
  const [filter, setFilter] = useState<EventFilter>(EMPTY_FILTER);

  // Fetch the session list unless events/sessions were injected.
  useEffect(() => {
    if (live || injectedSessions !== undefined) return;
    const ctrl = new AbortController();
    fetchSessions(undefined, ctrl.signal)
      .then((list) => {
        setSessions(list);
        setSession((cur) => cur ?? list[0]?.id);
      })
      .catch(() => {
        /* offline / no server — leave the list empty. */
      });
    return () => ctrl.abort();
  }, [live, injectedSessions]);

  // Open the live stream only when not injecting events.
  const stream = useEventStream(session, !live);
  const events = injectedEvents ?? stream.events;

  const filtered = useMemo(() => applyFilter(events, filter), [events, filter]);
  const totals = useMemo(() => sumTokens(events), [events]);
  const counts = useMemo(() => {
    const c: Partial<Record<EventType, number>> = {};
    for (const e of events) c[e.type] = (c[e.type] ?? 0) + 1;
    return c;
  }, [events]);

  const statusLabel = live ? 'static' : stream.status;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-col gap-3 border-b border-zinc-800 bg-zinc-950/70 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <span className="text-emerald-400" aria-hidden="true">
              ◆
            </span>
            Agent UI
          </h1>
          <span
            data-testid="stream-status"
            className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
              statusLabel === 'open'
                ? 'bg-emerald-500/15 text-emerald-300'
                : statusLabel === 'error'
                  ? 'bg-red-500/15 text-red-300'
                  : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {statusLabel}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <SessionSwitcher sessions={sessions} value={session} onChange={setSession} />
            <TokenMeter totals={totals} />
          </div>
        </div>
        <FilterBar filter={filter} onChange={setFilter} counts={counts} />
      </header>
      <main className="min-h-0 flex-1">
        <Timeline events={filtered} now={now} />
      </main>
    </div>
  );
}

export default App;
