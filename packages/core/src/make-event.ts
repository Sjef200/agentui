import type { AgentEventOfType, EventType } from './types.js';
import { newId } from './id.js';

/** What a caller must supply to {@link makeEvent}: everything except `v`, and with `id`/`ts` optional. */
export type MakeEventInput<K extends EventType> = Omit<AgentEventOfType<K>, 'v' | 'id' | 'ts'> & {
  id?: string;
  ts?: number;
};

/**
 * Build a complete {@link AgentEvent}, filling in `v: 1`, a fresh id, and
 * `ts: Date.now()`. Pass `id`/`ts` explicitly to override (e.g. when replaying).
 */
export function makeEvent<K extends EventType>(input: MakeEventInput<K>): AgentEventOfType<K> {
  const { id, ts, ...rest } = input;
  return {
    v: 1,
    id: id ?? newId(),
    ts: ts ?? Date.now(),
    ...rest,
  } as AgentEventOfType<K>;
}
