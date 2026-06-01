import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEventStream } from '../src/hooks/useEventStream.js';
import { loadFixture } from './fixtures.js';

const events = loadFixture('claude-code-basic.jsonl');

/** A minimal fake EventSource that lets a test push messages and capture instances. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  onopen: ((this: EventSource, ev: Event) => unknown) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null = null;
  onerror: ((this: EventSource, ev: Event) => unknown) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  emitOpen(): void {
    this.onopen?.call(this as unknown as EventSource, new Event('open'));
  }
  emit(data: unknown): void {
    this.onmessage?.call(
      this as unknown as EventSource,
      new MessageEvent('message', { data: JSON.stringify(data) }),
    );
  }
  close(): void {
    this.closed = true;
  }
}

describe('useEventStream', () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens an EventSource against the stream URL for the session', () => {
    renderHook(() => useEventStream('sess-cc-basic'));
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0]!.url).toContain('/stream?session=sess-cc-basic');
  });

  it('accumulates valid events and dedupes by seq', async () => {
    const { result } = renderHook(() => useEventStream('sess-cc-basic'));
    const src = FakeEventSource.instances[0]!;

    act(() => {
      src.emitOpen();
      src.emit(events[0]);
      src.emit(events[1]);
      src.emit(events[1]); // duplicate seq — should be ignored
    });

    await waitFor(() => expect(result.current.events).toHaveLength(2));
    expect(result.current.status).toBe('open');
    expect(result.current.events.map((e) => e.seq)).toEqual([0, 1]);
  });

  it('ignores malformed / non-schema payloads', async () => {
    const { result } = renderHook(() => useEventStream('sess-cc-basic'));
    const src = FakeEventSource.instances[0]!;
    act(() => {
      src.emit({ not: 'an event' });
      src.emit(events[0]);
    });
    await waitFor(() => expect(result.current.events).toHaveLength(1));
  });

  it('does not open a connection when disabled', () => {
    renderHook(() => useEventStream('sess-cc-basic', false));
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('closes the source on unmount', () => {
    const { unmount } = renderHook(() => useEventStream('sess-cc-basic'));
    const src = FakeEventSource.instances[0]!;
    unmount();
    expect(src.closed).toBe(true);
  });
});
