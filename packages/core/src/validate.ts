import type { AgentEvent } from './types.js';
import { agentEventSchema } from './schema.js';

/**
 * Parse and validate an unknown value as an {@link AgentEvent}.
 *
 * Throws a `ZodError` on anything invalid — unknown event `type`, a missing or
 * ill-typed required field, etc. Returns the parsed event (unknown extra keys
 * are stripped) so callers get a clean, typed object.
 */
export function validate(event: unknown): AgentEvent {
  return agentEventSchema.parse(event) as AgentEvent;
}

/** Non-throwing variant: a type guard that returns `false` instead of throwing. */
export function isValid(event: unknown): event is AgentEvent {
  return agentEventSchema.safeParse(event).success;
}
