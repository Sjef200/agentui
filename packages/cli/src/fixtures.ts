/**
 * Fixture discovery and JSONL parsing for the `demo` command.
 *
 * Events are validated through `@agent-ui/core` so the CLI never carries its own
 * copy of the schema; a malformed line is reported with its line number.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, type AgentEvent } from '@agent-ui/core';

/** The repo's default fixture, relative to a `fixtures/` directory. */
export const DEFAULT_FIXTURE = 'claude-code-basic.jsonl';

/**
 * Find the nearest `fixtures/` directory by walking up from `startDir`.
 * Returns its absolute path, or `undefined` if none is found before the root.
 */
export function findFixturesDir(startDir: string): string | undefined {
  let dir = resolve(startDir);
  // Walk to the filesystem root; `dirname('/')` === '/' is the stop condition.
  for (;;) {
    const candidate = join(dir, 'fixtures');
    if (existsSync(candidate)) return candidate;

    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Resolve a user-supplied fixture argument to an absolute path.
 *
 * - An absolute path, or a relative path that exists from the cwd, is used as-is.
 * - A bare name (e.g. `claude-code-basic.jsonl`) — or no argument at all — is
 *   resolved against the nearest `fixtures/` dir found by walking up from the
 *   cwd, falling back to a `fixtures/` dir bundled next to this package.
 */
export function resolveFixturePath(input: string | undefined, cwd: string): string {
  if (input && (isAbsolute(input) || existsSync(resolve(cwd, input)))) {
    return resolve(cwd, input);
  }

  const name = input ?? DEFAULT_FIXTURE;

  const fromCwd = findFixturesDir(cwd);
  if (fromCwd) return join(fromCwd, name);

  // Fall back to a fixtures dir relative to the installed package location.
  const pkgDir = dirname(dirname(fileURLToPath(import.meta.url)));
  const fromPkg = findFixturesDir(pkgDir);
  if (fromPkg) return join(fromPkg, name);

  // Nothing found — return a best-effort path so the caller can report a clear
  // "file not found" error against a concrete location.
  return resolve(cwd, name);
}

/**
 * Parse JSONL text into validated {@link AgentEvent}s.
 *
 * Blank lines (including a trailing newline) are skipped. A line that is not
 * valid JSON, or that fails schema validation, throws an `Error` naming the
 * 1-based line number.
 */
export function parseFixture(text: string): AgentEvent[] {
  const events: AgentEvent[] = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid JSON on line ${i + 1}: ${reason}`);
    }

    try {
      events.push(validate(json));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid event on line ${i + 1}: ${reason}`);
    }
  }

  return events;
}

/** Read and parse a fixture file from disk. */
export async function loadFixture(path: string): Promise<AgentEvent[]> {
  const text = await readFile(path, 'utf8');
  return parseFixture(text);
}
