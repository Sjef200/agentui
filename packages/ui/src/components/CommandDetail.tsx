import { useState } from 'react';
import type { CommandData } from '@agent-ui/core';

/**
 * Detail for a `command` event: the command, cwd, exit code, and collapsible
 * stdout/stderr streams. A nonzero (or undefined-but-present-stderr) exit code
 * gets red error styling.
 */
export function CommandDetail({ data }: { data: CommandData }): JSX.Element {
  const failed = typeof data.exitCode === 'number' && data.exitCode !== 0;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <code className="font-mono text-cyan-300 break-all">$ {data.cmd}</code>
        {data.cwd && <span className="text-zinc-500">in {data.cwd}</span>}
        <span
          data-failed={failed}
          className={`ml-auto rounded px-1.5 py-0.5 font-mono ${
            failed
              ? 'bg-red-500/15 text-red-300'
              : 'bg-emerald-500/15 text-emerald-300'
          }`}
        >
          exit {data.exitCode ?? '—'}
        </span>
      </div>
      {data.stdout !== undefined && data.stdout !== '' && (
        <Stream label="stdout" text={data.stdout} tone="out" />
      )}
      {data.stderr !== undefined && data.stderr !== '' && (
        <Stream label="stderr" text={data.stderr} tone={failed ? 'err' : 'out'} />
      )}
    </div>
  );
}

function Stream({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: 'out' | 'err';
}): JSX.Element {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-1 text-left text-[11px] uppercase tracking-wide text-zinc-400 hover:text-zinc-200"
      >
        <span className="inline-block w-3 text-zinc-500">{open ? '▾' : '▸'}</span>
        <span className={tone === 'err' ? 'text-red-400' : 'text-zinc-400'}>{label}</span>
      </button>
      {open && (
        <pre
          className={`overflow-x-auto whitespace-pre-wrap break-words px-3 pb-2 font-mono text-xs ${
            tone === 'err' ? 'text-red-300' : 'text-zinc-300'
          }`}
        >
          {text}
        </pre>
      )}
    </div>
  );
}
