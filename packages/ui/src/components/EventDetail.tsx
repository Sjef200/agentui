import type { AgentEvent } from '@agent-ui/core';
import { FileEditDetail } from './FileEditDetail.js';
import { CommandDetail } from './CommandDetail.js';
import { MessageBubble } from './MessageBubble.js';
import { ToolDetail } from './ToolDetail.js';
import { prettyJson } from '../lib/format.js';

/**
 * Expanded detail view for a single event. Dispatches on `event.type` to the
 * matching presentational component. Pure — takes the event via props.
 */
export function EventDetail({ event }: { event: AgentEvent }): JSX.Element {
  switch (event.type) {
    case 'file_edit':
      return <FileEditDetail data={event.data} />;
    case 'command':
      return <CommandDetail data={event.data} />;
    case 'message':
      return <MessageBubble data={event.data} />;
    case 'tool_call':
    case 'tool_result':
      return <ToolDetail data={event.data} />;
    case 'error':
      return (
        <div className="space-y-1">
          <div className="text-sm text-red-300">{event.data.message}</div>
          {event.data.detail && (
            <pre className="overflow-x-auto rounded-md border border-red-900/40 bg-red-500/5 p-2 font-mono text-xs text-red-200/80">
              {event.data.detail}
            </pre>
          )}
        </div>
      );
    case 'session_start':
    case 'session_end':
    case 'token_usage':
      return (
        <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-xs text-zinc-300">
          {prettyJson(event.data)}
        </pre>
      );
    default: {
      const _never: never = event;
      return _never;
    }
  }
}
