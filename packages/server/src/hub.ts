import type { AgentEvent } from '@agent-ui/core';

/** A live subscriber callback: invoked once per newly-ingested event. */
export type Subscriber = (event: AgentEvent) => void;

/**
 * Per-session publish/subscribe with a bounded in-memory ring buffer.
 *
 * The ring is a fast cache for live broadcast; the {@link Store} remains the
 * source of truth for replay. Subscribers are notified synchronously on
 * `publish`, in subscription order.
 */
export class Hub {
  private readonly ringCap: number;
  private readonly subscribers = new Map<string, Set<Subscriber>>();
  private readonly rings = new Map<string, AgentEvent[]>();

  constructor(ringCap: number) {
    this.ringCap = Math.max(0, ringCap);
  }

  /** Subscribe to a session's live events. Returns an unsubscribe function. */
  subscribe(session: string, fn: Subscriber): () => void {
    let set = this.subscribers.get(session);
    if (set === undefined) {
      set = new Set<Subscriber>();
      this.subscribers.set(session, set);
    }
    set.add(fn);
    return () => {
      const current = this.subscribers.get(session);
      if (current === undefined) return;
      current.delete(fn);
      if (current.size === 0) this.subscribers.delete(session);
    };
  }

  /** Push an event into the ring and notify all subscribers of its session. */
  publish(event: AgentEvent): void {
    this.pushRing(event);
    const set = this.subscribers.get(event.session);
    if (set === undefined) return;
    // Snapshot so an unsubscribe during iteration is safe.
    for (const fn of [...set]) fn(event);
  }

  private pushRing(event: AgentEvent): void {
    if (this.ringCap === 0) return;
    let ring = this.rings.get(event.session);
    if (ring === undefined) {
      ring = [];
      this.rings.set(event.session, ring);
    }
    ring.push(event);
    if (ring.length > this.ringCap) ring.splice(0, ring.length - this.ringCap);
  }

  /** Most recent buffered events for a session (oldest first); a fast-path cache. */
  ring(session: string): readonly AgentEvent[] {
    return this.rings.get(session) ?? [];
  }
}
