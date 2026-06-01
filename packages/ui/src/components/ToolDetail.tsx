import type { ToolCallData, ToolResultData } from '@agent-ui/core';
import { prettyJson } from '../lib/format.js';

/** Detail for `tool_call` / `tool_result`: tool name + pretty-printed JSON payload. */
export function ToolDetail({
  data,
}: {
  data: ToolCallData | ToolResultData;
}): JSX.Element {
  const isResult = 'ok' in data;
  const payload = isResult ? (data as ToolResultData).result : (data as ToolCallData).args;
  const ok = isResult ? (data as ToolResultData).ok : undefined;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-violet-300">{data.name}</span>
        {ok !== undefined && (
          <span
            data-ok={ok}
            className={`rounded px-1.5 py-0.5 font-mono ${
              ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
            }`}
          >
            {ok ? 'ok' : 'failed'}
          </span>
        )}
      </div>
      {payload !== undefined && (
        <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-xs text-zinc-300">
          {prettyJson(payload)}
        </pre>
      )}
    </div>
  );
}
