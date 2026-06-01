import { defineConfig } from 'vitest/config';

// Root config aggregates every package as a Vitest "project" so `vitest run`
// from the repo root executes all suites. Per-package configs live in
// packages/*/vitest.config.ts.
export default defineConfig({
  test: {
    projects: ['packages/*'],
    passWithNoTests: true,
  },
});
