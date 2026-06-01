import type { MessageData } from '@agent-ui/core';

/**
 * Detail for a `message` event: a role-styled bubble. User messages sit on the
 * right with a sky tint; assistant messages on the left, neutral. Not a chat
 * app — these are inline expansions inside the activity feed.
 */
export function MessageBubble({ data }: { data: MessageData }): JSX.Element {
  const isUser = data.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        data-role={data.role}
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/20'
            : 'bg-zinc-800/70 text-zinc-100 ring-1 ring-zinc-700/50'
        }`}
      >
        <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
          {data.role}
        </div>
        {data.text}
      </div>
    </div>
  );
}
