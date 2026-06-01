import { describe, expectTypeOf, it } from 'vitest';
import type { InferredAgentEvent } from '../src/schema.js';
import type { AgentEvent } from '../src/types.js';

// Guard against drift between the hand-written discriminated union and the zod
// schema: each must be assignable to the other.
describe('schema/type parity', () => {
  it('the zod-inferred event matches the hand-written AgentEvent', () => {
    expectTypeOf<InferredAgentEvent>().toMatchTypeOf<AgentEvent>();
    expectTypeOf<AgentEvent>().toMatchTypeOf<InferredAgentEvent>();
  });
});
