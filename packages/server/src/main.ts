import { buildServer } from './server.js';
import { resolveConfig } from './config.js';

/**
 * Production entrypoint: build the server from environment config and listen.
 * `pnpm --filter @agent-ui/server dev` runs this under `tsx watch`; `start`
 * runs the built `dist/main.js`.
 */
async function main(): Promise<void> {
  const config = resolveConfig();
  const app = buildServer();

  const close = (): void => {
    void app.close().then(() => process.exit(0));
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`agent-ui server listening on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
