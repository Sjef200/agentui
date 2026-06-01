// Public surface of @agent-ui/server: build the server, the Store interface and
// backends, and configuration. The event schema itself lives in @agent-ui/core.
export { buildServer } from './server.js';
export type { BuildServerOptions } from './server.js';

export type { Store, SessionMeta } from './store.js';
export { JsonlStore, createJsonlStore } from './store-jsonl.js';
export { SqliteStore, createSqliteStore } from './store-sqlite.js';
export { createStore } from './store-factory.js';
export { Hub } from './hub.js';
export type { Subscriber } from './hub.js';

export {
  resolveConfig,
  DEFAULT_CONFIG,
  type ServerConfig,
  type ConfigOverrides,
  type StoreKind,
} from './config.js';
