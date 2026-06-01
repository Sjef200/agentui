/**
 * Server configuration, resolved from environment variables with the defaults
 * defined in `docs/CONTRACT.md`. A resolver accepts explicit overrides so tests
 * can construct a config without touching `process.env`.
 */

/** The store backends supported by `AGENT_UI_STORE`. */
export type StoreKind = 'jsonl' | 'sqlite';

export interface ServerConfig {
  /** HTTP port. `0` binds an ephemeral port (handy for tests). */
  port: number;
  /** Bind address. */
  host: string;
  /** Directory where JSONL session files (or the SQLite db file) live. */
  dataDir: string;
  /** Which store backend to use. */
  store: StoreKind;
  /** In-memory live buffer cap, per session. */
  ringCap: number;
}

/** Overrides accepted by {@link resolveConfig}; anything omitted falls back to env/defaults. */
export type ConfigOverrides = Partial<ServerConfig>;

export const DEFAULT_CONFIG: ServerConfig = {
  port: 4317,
  host: '127.0.0.1',
  dataDir: '.data',
  store: 'jsonl',
  ringCap: 5000,
};

function parseIntOr(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseStoreKind(value: string | undefined, fallback: StoreKind): StoreKind {
  return value === 'sqlite' || value === 'jsonl' ? value : fallback;
}

/**
 * Resolve the effective config. Precedence: explicit `overrides` >
 * environment variables > {@link DEFAULT_CONFIG}.
 */
export function resolveConfig(
  overrides: ConfigOverrides = {},
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  const fromEnv: ServerConfig = {
    port: parseIntOr(env.PORT, DEFAULT_CONFIG.port),
    host: env.HOST && env.HOST.trim() !== '' ? env.HOST : DEFAULT_CONFIG.host,
    dataDir: env.DATA_DIR && env.DATA_DIR.trim() !== '' ? env.DATA_DIR : DEFAULT_CONFIG.dataDir,
    store: parseStoreKind(env.AGENT_UI_STORE, DEFAULT_CONFIG.store),
    ringCap: parseIntOr(env.RING_CAP, DEFAULT_CONFIG.ringCap),
  };

  return {
    port: overrides.port ?? fromEnv.port,
    host: overrides.host ?? fromEnv.host,
    dataDir: overrides.dataDir ?? fromEnv.dataDir,
    store: overrides.store ?? fromEnv.store,
    ringCap: overrides.ringCap ?? fromEnv.ringCap,
  };
}
