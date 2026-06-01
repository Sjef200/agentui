import { z } from 'zod';

/**
 * The zod mirror of the TypeScript event types in `types.ts`.
 *
 * `validate()` uses this to reject unknown event types and missing/ill-typed
 * required fields at runtime. A compile-time test asserts this schema and the
 * hand-written types never drift.
 */

const baseShape = {
  v: z.literal(1),
  id: z.string().min(1),
  session: z.string().min(1),
  seq: z.number().int().nonnegative(),
  ts: z.number().int().nonnegative(),
  agent: z.string().min(1),
};

export const sessionStartDataSchema = z.object({
  cwd: z.string().optional(),
  title: z.string().optional(),
});

export const sessionEndDataSchema = z.object({
  reason: z.string().optional(),
});

export const messageDataSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string(),
});

export const toolCallDataSchema = z.object({
  name: z.string().min(1),
  args: z.unknown().optional(),
});

export const toolResultDataSchema = z.object({
  name: z.string().min(1),
  ok: z.boolean(),
  result: z.unknown().optional(),
});

export const fileEditDataSchema = z.object({
  path: z.string().min(1),
  diff: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
});

export const commandDataSchema = z.object({
  cmd: z.string(),
  cwd: z.string().optional(),
  exitCode: z.number().int().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});

export const tokenDataSchema = z.object({
  input: z.number().int().nonnegative(),
  output: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative().optional(),
});

export const errorDataSchema = z.object({
  message: z.string(),
  detail: z.string().optional(),
});

export const agentEventSchema = z.discriminatedUnion('type', [
  z.object({ ...baseShape, type: z.literal('session_start'), data: sessionStartDataSchema }),
  z.object({ ...baseShape, type: z.literal('session_end'), data: sessionEndDataSchema }),
  z.object({ ...baseShape, type: z.literal('message'), data: messageDataSchema }),
  z.object({ ...baseShape, type: z.literal('tool_call'), data: toolCallDataSchema }),
  z.object({ ...baseShape, type: z.literal('tool_result'), data: toolResultDataSchema }),
  z.object({ ...baseShape, type: z.literal('file_edit'), data: fileEditDataSchema }),
  z.object({ ...baseShape, type: z.literal('command'), data: commandDataSchema }),
  z.object({ ...baseShape, type: z.literal('token_usage'), data: tokenDataSchema }),
  z.object({ ...baseShape, type: z.literal('error'), data: errorDataSchema }),
]);

/** The inferred type of a parsed event. Used by a test to guard against drift. */
export type InferredAgentEvent = z.infer<typeof agentEventSchema>;
