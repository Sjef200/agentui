import type { FileEditData } from '@agent-ui/core';
import { parseDiff, type DiffLine } from '../lib/format.js';

/** Tailwind classes per diff-line kind. Adds green, deletes red, hunks/meta dimmed. */
const LINE_CLASS: Record<DiffLine['kind'], string> = {
  add: 'text-emerald-300 bg-emerald-500/10',
  del: 'text-red-300 bg-red-500/10',
  hunk: 'text-sky-400/80 bg-sky-500/5',
  meta: 'text-zinc-500',
  context: 'text-zinc-300',
};

/**
 * Detail for a `file_edit` event: the path plus a colored unified diff. If no
 * diff string is present, falls back to before/after blocks.
 */
export function FileEditDetail({ data }: { data: FileEditData }): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="font-mono text-xs text-amber-300/90 break-all">{data.path}</div>
      {data.diff ? (
        <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950/60 text-xs leading-relaxed">
          <code className="block font-mono">
            {parseDiff(data.diff).map((line, i) => (
              <span
                key={i}
                data-kind={line.kind}
                className={`block whitespace-pre px-3 ${LINE_CLASS[line.kind]}`}
              >
                {line.text === '' ? ' ' : line.text}
              </span>
            ))}
          </code>
        </pre>
      ) : (
        <BeforeAfter before={data.before} after={data.after} />
      )}
    </div>
  );
}

function BeforeAfter({ before, after }: { before?: string; after?: string }): JSX.Element {
  if (before === undefined && after === undefined) {
    return <div className="text-xs text-zinc-500">No diff available.</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {before !== undefined && (
        <pre className="overflow-x-auto rounded-md border border-red-900/40 bg-red-500/5 p-2 font-mono text-xs text-red-200/80">
          {before}
        </pre>
      )}
      {after !== undefined && (
        <pre className="overflow-x-auto rounded-md border border-emerald-900/40 bg-emerald-500/5 p-2 font-mono text-xs text-emerald-200/80">
          {after}
        </pre>
      )}
    </div>
  );
}
