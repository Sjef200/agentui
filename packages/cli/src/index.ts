#!/usr/bin/env node
/**
 * `agent-ui` CLI.
 *
 * Phase 2.2 ships the `demo` fixture player end to end. `watch`, `ingest`,
 * `replay`, and `init` are intentionally stubbed — they belong to later phases
 * (5 / 6.2) and are verified locally, not part of the web-buildable scope yet.
 */

import { Command } from 'commander';
import { DEFAULT_SERVER, runDemo, ServerDownError } from './player.js';

interface DemoFlags {
  server: string;
  fast: boolean;
  speed: string;
  session?: string;
}

const program = new Command();

program
  .name('agent-ui')
  .description('Watch, ingest, replay, and demo AI coding-agent sessions.')
  .version('0.0.0');

program
  .command('demo')
  .description('Replay a JSONL fixture into a running server, paced by event timestamps.')
  .argument('[fixture]', 'fixture file or name (default: claude-code-basic.jsonl)')
  .option('--server <url>', 'server base URL', DEFAULT_SERVER)
  .option('--fast', 'stream with no delays', false)
  .option('--speed <n>', 'divide inter-event delays by this factor', '1')
  .option('--session <id>', 'override the session id on every event')
  .action(async (fixture: string | undefined, raw: DemoFlags) => {
    const speed = Number(raw.speed);
    if (!Number.isFinite(speed) || speed <= 0) {
      console.error(`Invalid --speed "${raw.speed}": expected a positive number.`);
      process.exitCode = 1;
      return;
    }

    try {
      await runDemo(fixture, {
        server: raw.server,
        fast: raw.fast,
        speed,
        session: raw.session,
      });
    } catch (err) {
      if (err instanceof ServerDownError) {
        console.error(`\n${err.message}`);
      } else {
        console.error(`\nDemo failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      process.exitCode = 1;
    }
  });

/** Register a placeholder subcommand that prints guidance and exits cleanly (0). */
function stub(name: string, description: string, guidance: string): void {
  program
    .command(name)
    .description(`${description} (not implemented yet)`)
    .allowUnknownOption(true)
    .action(() => {
      console.log(`agent-ui ${name}: ${guidance}`);
      console.log('Try `agent-ui demo` to replay a fixture into a running server.');
    });
}

stub(
  'watch',
  'Tail a live agent and stream its events to the server.',
  'Phase 5: `watch` is verified locally and is not part of the web-buildable scope yet.',
);
stub(
  'ingest',
  'Read events from a file or stdin and POST them to the server.',
  'Phase 6.2: `ingest` is verified locally and is not part of the web-buildable scope yet.',
);
stub(
  'replay',
  'Replay a stored session from the server.',
  'Phase 6.2: `replay` is verified locally and is not part of the web-buildable scope yet.',
);
stub(
  'init',
  'Scaffold agent-ui config in the current project.',
  'Phase 6.2: `init` is verified locally and is not part of the web-buildable scope yet.',
);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
