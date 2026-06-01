// The contract. Adapters write only these events; every UI surface reads only them.
export type {
  AgentName,
  AgentEvent,
  AgentEventOfType,
  BaseEvent,
  EventType,
  EventDataMap,
  SessionStartData,
  SessionEndData,
  MessageData,
  ToolCallData,
  ToolResultData,
  FileEditData,
  CommandData,
  TokenData,
  ErrorData,
} from './types.js';
export { EVENT_TYPES } from './types.js';

export {
  agentEventSchema,
  sessionStartDataSchema,
  sessionEndDataSchema,
  messageDataSchema,
  toolCallDataSchema,
  toolResultDataSchema,
  fileEditDataSchema,
  commandDataSchema,
  tokenDataSchema,
  errorDataSchema,
} from './schema.js';
export type { InferredAgentEvent } from './schema.js';

export { validate, isValid } from './validate.js';
export { makeEvent } from './make-event.js';
export type { MakeEventInput } from './make-event.js';
export { newId } from './id.js';
export { redact, DEFAULT_PATTERNS } from './redact.js';
export type { RedactConfig } from './redact.js';
