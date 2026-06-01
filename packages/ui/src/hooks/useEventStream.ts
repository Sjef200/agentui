import { useEffect, useRef, useState } from 'react';
import type { AgentEvent } from '@agent-ui/core';
import { isValid } from '@agent-ui/core';
import { streamUrl } from '../lib/server.js';

export type StreamStatus = 'idle' | 'connecting' | 'open' | 'error';

export interface EventStream {
  events: AgentEvent[];
  status: StreamStatus;
}

/**
 * Connect an {@link EventSource} to `${SERVER}/stream?session=<id>` and
 * accumulate the events it streams (replay first, then live — see CONTRACT.md).
 *
 * The connection is opened ONLY inside the effect, never at module load, so
 * importing presentational components in tests never touches the network.
 * Re-keys on `session`: switching sessions tears down the old source and clears
 * the buffer. Pass `enabled = false` (e.g. in tests) to skip connecting.
 */
export function useEventStream(session?: string, enabled = true): EventStream {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  // Track seen seqs to drop duplicates a reconnect/replay might resend.
  const seenSeqRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    if (typeof EventSource === 'undefined') {
      setStatus('error');
      return;
    }

    setEvents([]);
    seenSeqRef.current = new Set();
    setStatus('connecting');

    const source = new EventSource(streamUrl(session));

    source.onopen = () => setStatus('open');

    source.onmessage = (e: MessageEvent<string>) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!isValid(parsed)) return;
      const event = parsed;
      setEvents((prev) => {
        if (seenSeqRef.current.has(event.seq)) return prev;
        seenSeqRef.current.add(event.seq);
        return [...prev, event];
      });
    };

    source.onerror = () => {
      // EventSource auto-reconnects; surface the degraded state meanwhile.
      setStatus((s) => (s === 'open' ? 'open' : 'error'));
    };

    return () => {
      source.close();
    };
  }, [session, enabled]);

  return { events, status };
}
