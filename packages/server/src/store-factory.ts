import { join } from 'node:path';
import type { ServerConfig } from './config.js';
import type { Store } from './store.js';
import { JsonlStore } from './store-jsonl.js';
import { SqliteStore } from './store-sqlite.js';

/**
 * Build the configured store backend.
 *
 * - `jsonl` (default): one append-only file per session under `dataDir`.
 * - `sqlite`: a single `events.db` (WAL) under `dataDir`.
 */
export function createStore(config: ServerConfig): Store {
  if (config.store === 'sqlite') {
    return new SqliteStore(join(config.dataDir, 'events.db'));
  }
  return new JsonlStore(config.dataDir);
}
