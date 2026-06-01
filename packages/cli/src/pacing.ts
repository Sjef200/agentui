/**
 * Pure pacing math for the fixture player.
 *
 * Kept dependency-free and side-effect-free so it is trivially unit-testable
 * without a server, a clock, or the filesystem. The player module (`player.ts`)
 * consumes the array this returns and performs the actual awaited sleeps.
 */

/** Default upper bound for a single inter-event wait, in milliseconds. */
export const DEFAULT_MAX_DELAY_MS = 2000;

export interface ComputeDelaysOptions {
  /** When true, every delay is 0 (stream as fast as possible). */
  fast?: boolean;
  /** Clamp each delay to at most this many ms. Defaults to {@link DEFAULT_MAX_DELAY_MS}. */
  maxDelayMs?: number;
  /** Divide each raw delta by this factor (e.g. `2` plays at 2x speed). */
  speed?: number;
}

/**
 * Compute the delay (ms) to wait BEFORE emitting each event, derived from the
 * `ts` deltas between consecutive events.
 *
 * - Returns one delay per timestamp; index `0` is always `0` (nothing precedes
 *   the first event).
 * - `delay[i] = clamp((ts[i] - ts[i-1]) / speed, 0, maxDelayMs)`.
 * - `fast` short-circuits to all zeros.
 * - Non-finite or negative deltas (e.g. out-of-order or duplicate timestamps)
 *   collapse to `0`. The cap keeps demos snappy even across large time gaps.
 */
export function computeDelays(timestamps: number[], opts: ComputeDelaysOptions = {}): number[] {
  const { fast = false } = opts;
  const maxDelayMs = opts.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const rawSpeed = opts.speed ?? 1;
  // Guard against zero / negative / non-finite speed, which would otherwise
  // produce Infinity or NaN delays.
  const speed = Number.isFinite(rawSpeed) && rawSpeed > 0 ? rawSpeed : 1;

  return timestamps.map((ts, i) => {
    if (fast || i === 0) return 0;

    const prev = timestamps[i - 1];
    if (prev === undefined) return 0;

    const delta = (ts - prev) / speed;
    if (!Number.isFinite(delta) || delta <= 0) return 0;

    return Math.min(delta, maxDelayMs);
  });
}
