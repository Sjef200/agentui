import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, type AgentEvent } from '@agent-ui/core';

/** Repo `fixtures/` dir, resolved the same way packages/core/test does. */
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures');

/** Read a `.jsonl` fixture and validate every line through the core schema. */
export function loadFixture(file: string): AgentEvent[] {
  return readFileSync(join(fixturesDir, file), 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line): AgentEvent => validate(JSON.parse(line)));
}
