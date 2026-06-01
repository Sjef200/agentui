import type { AgentEvent, EventType } from '@agent-ui/core';

/** Human label for each event type, used in row headers and filter chips. */
export const TYPE_LABELS: Record<EventType, string> = {
  session_start: 'Session start',
  session_end: 'Session end',
  message: 'Message',
  tool_call: 'Tool call',
  tool_result: 'Tool result',
  file_edit: 'File edit',
  command: 'Command',
  token_usage: 'Token usage',
  error: 'Error',
};

/** A legible monochrome-friendly icon per type. Emoji keeps it dependency-free. */
export const TYPE_ICONS: Record<EventType, string> = {
  session_start: '▶',
  session_end: '■',
  message: '💬',
  tool_call: '🔧',
  tool_result: '📥',
  file_edit: '✎',
  command: '⌘',
  token_usage: '◷',
  error: '⚠',
};

/** Tailwind text-color class per type, for the icon/label accent. */
export const TYPE_ACCENTS: Record<EventType, string> = {
  session_start: 'text-emerald-400',
  session_end: 'text-zinc-400',
  message: 'text-sky-400',
  tool_call: 'text-violet-400',
  tool_result: 'text-violet-300',
  file_edit: 'text-amber-400',
  command: 'text-cyan-400',
  token_usage: 'text-zinc-400',
  error: 'text-red-400',
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Compact relative time like `now`, `12s`, `5m`, `3h`, `2d` for a timeline row. */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const delta = now - ts;
  if (delta < 0) return 'now';
  if (delta < 5 * SECOND) return 'now';
  if (delta < MINUTE) return `${Math.floor(delta / SECOND)}s`;
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h`;
  return `${Math.floor(delta / DAY)}d`;
}

/** Absolute wall-clock time for tooltips/detail headers. */
export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function firstLine(text: string): string {
  const idx = text.indexOf('\n');
  return idx === -1 ? text : text.slice(0, idx);
}

function truncate(text: string, max = 140): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/**
 * A single-line summary of an event for its timeline row. Pure and
 * type-narrowed on `event.type` so every variant gets a tailored line.
 */
export function summarize(event: AgentEvent): string {
  switch (event.type) {
    case 'session_start':
      return event.data.title ?? event.data.cwd ?? 'Session started';
    case 'session_end':
      return event.data.reason ? `Ended: ${event.data.reason}` : 'Session ended';
    case 'message':
      return `${event.data.role}: ${truncate(firstLine(event.data.text))}`;
    case 'tool_call':
      return event.data.name;
    case 'tool_result':
      return `${event.data.name} ${event.data.ok ? 'ok' : 'failed'}`;
    case 'file_edit':
      return event.data.path;
    case 'command': {
      const code = event.data.exitCode;
      const suffix = code === undefined ? '' : ` (exit ${code})`;
      return `${truncate(firstLine(event.data.cmd))}${suffix}`;
    }
    case 'token_usage': {
      const { input, output } = event.data;
      const cost = event.data.costUsd;
      const costPart = cost === undefined ? '' : ` · ${formatUsd(cost)}`;
      return `${input.toLocaleString()} in / ${output.toLocaleString()} out${costPart}`;
    }
    case 'error':
      return truncate(firstLine(event.data.message));
    default: {
      // Exhaustiveness guard: every EventType is handled above.
      const _never: never = event;
      return _never;
    }
  }
}

/** Format a USD cost compactly; sub-cent values keep more precision. */
export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

/** A parsed line of a unified diff, tagged by its role for styling. */
export interface DiffLine {
  kind: 'add' | 'del' | 'hunk' | 'meta' | 'context';
  text: string;
}

/**
 * Parse a unified-diff string into tagged lines. Conservative and forgiving:
 * `+++`/`---` file headers are `meta`, `@@` hunks are `hunk`, leading `+`/`-`
 * are adds/deletes, everything else is `context`.
 */
export function parseDiff(diff: string): DiffLine[] {
  const lines = diff.split('\n');
  // Drop a single trailing empty line produced by a final newline.
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines.map((text): DiffLine => {
    if (text.startsWith('+++') || text.startsWith('---') || text.startsWith('diff ')) {
      return { kind: 'meta', text };
    }
    if (text.startsWith('@@')) {
      return { kind: 'hunk', text };
    }
    if (text.startsWith('+')) {
      return { kind: 'add', text };
    }
    if (text.startsWith('-')) {
      return { kind: 'del', text };
    }
    return { kind: 'context', text };
  });
}

/** Stable pretty-printed JSON for tool args/results; non-JSON values stringify safely. */
export function prettyJson(value: unknown): string {
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
