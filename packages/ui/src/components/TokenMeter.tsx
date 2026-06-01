import type { TokenTotals } from '../lib/totals.js';
import { formatUsd } from '../lib/format.js';

/**
 * A compact running token/cost meter. Takes pre-aggregated {@link TokenTotals}
 * via props (see `sumTokens`) so it is trivially testable.
 */
export function TokenMeter({ totals }: { totals: TokenTotals }): JSX.Element {
  const hasData = totals.samples > 0;
  return (
    <div
      data-testid="token-meter"
      className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs"
    >
      <Stat label="in" value={hasData ? totals.input.toLocaleString() : '—'} className="text-sky-300" />
      <span className="text-zinc-700">/</span>
      <Stat
        label="out"
        value={hasData ? totals.output.toLocaleString() : '—'}
        className="text-emerald-300"
      />
      <span className="text-zinc-700">·</span>
      <Stat
        label="cost"
        value={hasData ? formatUsd(totals.costUsd) : '—'}
        className="text-amber-300"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}): JSX.Element {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      <span className={`font-mono tabular-nums ${className}`}>{value}</span>
    </span>
  );
}
