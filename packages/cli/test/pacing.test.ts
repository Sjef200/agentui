import { describe, expect, it } from 'vitest';
import { computeDelays, DEFAULT_MAX_DELAY_MS } from '../src/pacing.js';

describe('computeDelays', () => {
  it('returns one delay per timestamp with index 0 = 0', () => {
    const delays = computeDelays([0, 1000, 1500, 2000]);
    expect(delays).toHaveLength(4);
    expect(delays[0]).toBe(0);
  });

  it('derives positive delays from monotonic timestamps', () => {
    const delays = computeDelays([0, 1000, 1300, 1800]);
    expect(delays).toEqual([0, 1000, 300, 500]);
  });

  it('returns [0] for a single event', () => {
    expect(computeDelays([1780272000000])).toEqual([0]);
  });

  it('returns [] for no events', () => {
    expect(computeDelays([])).toEqual([]);
  });

  it('zeroes every delay when fast is true', () => {
    const delays = computeDelays([0, 1000, 1300, 9999], { fast: true });
    expect(delays).toEqual([0, 0, 0, 0]);
  });

  it('caps a delay when the gap exceeds maxDelayMs', () => {
    // Gap of 5000ms is clamped to the default 2000ms cap.
    const delays = computeDelays([0, 5000]);
    expect(delays[1]).toBe(DEFAULT_MAX_DELAY_MS);
  });

  it('honours a custom maxDelayMs', () => {
    const delays = computeDelays([0, 5000], { maxDelayMs: 500 });
    expect(delays).toEqual([0, 500]);
  });

  it('divides delays by speed', () => {
    expect(computeDelays([0, 1000, 1400], { speed: 2 })).toEqual([0, 500, 200]);
  });

  it('applies the cap after dividing by speed', () => {
    // Raw gap 6000ms / speed 2 = 3000ms, still above the 2000ms cap.
    expect(computeDelays([0, 6000], { speed: 2 })).toEqual([0, DEFAULT_MAX_DELAY_MS]);
  });

  it('collapses equal (duplicate) timestamps to 0', () => {
    expect(computeDelays([1000, 1000, 1000])).toEqual([0, 0, 0]);
  });

  it('collapses negative deltas (out-of-order timestamps) to 0', () => {
    expect(computeDelays([2000, 1000, 3000])).toEqual([0, 0, DEFAULT_MAX_DELAY_MS]);
  });

  it('treats non-finite timestamps as a 0 delay', () => {
    const delays = computeDelays([0, Number.NaN, 1000]);
    expect(delays[1]).toBe(0);
    expect(delays[2]).toBe(0);
  });

  it('falls back to speed 1 for non-positive or non-finite speed', () => {
    const base = computeDelays([0, 1000]);
    expect(computeDelays([0, 1000], { speed: 0 })).toEqual(base);
    expect(computeDelays([0, 1000], { speed: -2 })).toEqual(base);
    expect(computeDelays([0, 1000], { speed: Number.NaN })).toEqual(base);
  });
});
