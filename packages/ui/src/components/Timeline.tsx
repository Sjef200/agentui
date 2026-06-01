import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AgentEvent } from '@agent-ui/core';
import { EventRow } from './EventRow.js';

export interface TimelineProps {
  events: readonly AgentEvent[];
  /** "now" reference passed to rows for relative timestamps. */
  now?: number;
  /**
   * Initial viewport rect for the virtualizer. Lets non-layout environments
   * (jsdom) render rows deterministically; defaults to a sensible size.
   */
  initialRect?: { width: number; height: number };
}

const ESTIMATED_ROW = 56;
/** Distance from the bottom (px) within which we consider the user "at the bottom". */
const STICK_THRESHOLD = 64;

/**
 * Virtualized, auto-scrolling activity timeline. Renders one {@link EventRow}
 * per event and keeps the newest in view unless the user has scrolled up.
 * Takes events via props — no network here.
 */
export function Timeline({ events, now, initialRect }: TimelineProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  // Whether to keep pinning to the newest event. Starts true; flips off when the
  // user scrolls up, back on when they return to the bottom.
  const stickRef = useRef(true);
  const [stick, setStick] = useState(true);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW,
    overscan: 12,
    getItemKey: (index) => events[index]?.id ?? index,
    initialRect: initialRect ?? { width: 1000, height: 600 },
  });

  // Track whether the user is pinned to the bottom.
  const onScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance <= STICK_THRESHOLD;
    stickRef.current = atBottom;
    setStick(atBottom);
  }, []);

  // Auto-scroll to the newest event when pinned and the count grows. Runs on
  // mount too (initial count change), so the latest activity is shown first.
  useLayoutEffect(() => {
    if (!stickRef.current || events.length === 0) return;
    virtualizer.scrollToIndex(events.length - 1, { align: 'end' });
  }, [events.length, virtualizer]);

  const items = virtualizer.getVirtualItems();

  if (events.length === 0) {
    return (
      <div
        ref={parentRef}
        className="flex h-full items-center justify-center text-sm text-zinc-600"
        data-testid="timeline-empty"
      >
        Waiting for events…
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={parentRef}
        onScroll={onScroll}
        data-testid="timeline-scroll"
        className="h-full overflow-y-auto"
      >
        <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {items.map((item) => {
            const event = events[item.index];
            if (!event) return null;
            return (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${item.start}px)` }}
              >
                <EventRow
                  event={event}
                  expanded={expanded.has(event.id)}
                  onToggle={toggle}
                  now={now}
                />
              </div>
            );
          })}
        </div>
      </div>
      {!stick && (
        <button
          type="button"
          onClick={() => {
            stickRef.current = true;
            setStick(true);
            virtualizer.scrollToIndex(events.length - 1, { align: 'end' });
          }}
          className="absolute bottom-3 right-3 rounded-full bg-sky-500/90 px-3 py-1 text-xs font-medium text-white shadow-lg hover:bg-sky-400"
        >
          Jump to latest ↓
        </button>
      )}
    </div>
  );
}
