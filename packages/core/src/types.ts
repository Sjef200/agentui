/**
 * The event-schema contract.
 *
 * Adapters write ONLY these events; every UI surface reads ONLY these events.
 * Adding a new tool means writing a small adapter that emits this shape — never
 * touching the surfaces.
 */

/** Known agents, but any string is allowed so new tools work without a core change. */
export type AgentName = 'claude-code' | 'codex' | 'opencode' | 'cline' | (string & {});

export interface SessionStartData {
  cwd?: string;
  title?: string;
}

export interface SessionEndData {
  reason?: string;
}

export interface MessageData {
  role: 'user' | 'assistant';
  text: string;
}

export interface ToolCallData {
  name: string;
  args?: unknown;
}

export interface ToolResultData {
  name: string;
  ok: boolean;
  result?: unknown;
}

export interface FileEditData {
  path: string;
  /** Unified diff. */
  diff?: string;
  before?: string;
  after?: string;
}

export interface CommandData {
  cmd: string;
  cwd?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

export interface TokenData {
  input: number;
  output: number;
  costUsd?: number;
}

export interface ErrorData {
  message: string;
  detail?: string;
}

/** Maps each event type to its `data` payload. The single source of truth for the union. */
export interface EventDataMap {
  session_start: SessionStartData;
  session_end: SessionEndData;
  message: MessageData;
  tool_call: ToolCallData;
  tool_result: ToolResultData;
  file_edit: FileEditData;
  command: CommandData;
  token_usage: TokenData;
  error: ErrorData;
}

export type EventType = keyof EventDataMap;

/** Fields shared by every event, regardless of type. */
export interface BaseEvent {
  /** Schema version. */
  v: 1;
  /** Unique event id. */
  id: string;
  /** Groups one agent run. */
  session: string;
  /** Monotonic within a session — gives ordering and replay. */
  seq: number;
  /** Epoch milliseconds. */
  ts: number;
  agent: AgentName;
}

type EventForType<K extends EventType> = BaseEvent & { type: K; data: EventDataMap[K] };

/** A single normalized event. Discriminated on `type`; `type` and `data` stay in sync. */
export type AgentEvent = { [K in EventType]: EventForType<K> }[EventType];

/** Narrow the union to one event type, e.g. `AgentEventOfType<'command'>`. */
export type AgentEventOfType<K extends EventType> = EventForType<K>;

/** Every event type, in a stable order — handy for UI type filters. */
export const EVENT_TYPES = [
  'session_start',
  'session_end',
  'message',
  'tool_call',
  'tool_result',
  'file_edit',
  'command',
  'token_usage',
  'error',
] as const satisfies readonly EventType[];
