import type { AgentEvent } from './types.js';

/**
 * Secret scrubbing, applied to event `data` before storage and emission.
 *
 * Two sources of secrets are masked:
 *  - known env var values (auto-detected by secret-looking names, plus any names
 *    you list in `envKeys`, plus literal `envValues`), and
 *  - common token patterns (API keys, bearer tokens, AWS-style keys, JWTs, ...).
 *
 * Everything is configurable, and benign content is left untouched.
 */
export interface RedactConfig {
  /** Master switch. Default `true`. */
  enabled?: boolean;
  /** Replacement string. Default `[REDACTED]`. */
  mask?: string;
  /** Auto-scrub values of env vars whose name looks secret. Default `true`. */
  scrubEnv?: boolean;
  /** Additional env var NAMES whose values should be scrubbed. */
  envKeys?: string[];
  /** Explicit literal secret values to scrub. */
  envValues?: string[];
  /** Additional regex patterns. Each match is replaced with `mask`. */
  patterns?: RegExp[];
  /** Ignore env values shorter than this when auto-scrubbing. Default `6`. */
  minSecretLength?: number;
}

const DEFAULT_MASK = '[REDACTED]';

/** Env var names that, by convention, hold secrets. */
const SECRET_ENV_NAME = /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|PWD|CREDENTIAL|AUTH|PRIVATE)/i;

/** Built-in token patterns. Each pattern matches ONLY the secret to mask. */
export const DEFAULT_PATTERNS: readonly RegExp[] = [
  /sk-[A-Za-z0-9_-]{16,}/g, // OpenAI / Anthropic-style keys
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, // GitHub tokens
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, // AWS access key id
  /\bAIza[0-9A-Za-z_-]{20,}\b/g, // Google API key
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, // Slack tokens
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT
  /(?<=\b[Bb]earer\s)[A-Za-z0-9._~+/=-]+/g, // bearer token (keeps the "Bearer " prefix)
];

function envBag(): Record<string, string | undefined> {
  return typeof process !== 'undefined' && process.env ? process.env : {};
}

function collectLiteralSecrets(config: RedactConfig): string[] {
  const env = envBag();
  const minLen = config.minSecretLength ?? 6;
  const secrets = new Set<string>();

  if (config.scrubEnv !== false) {
    for (const [name, value] of Object.entries(env)) {
      if (value && value.length >= minLen && SECRET_ENV_NAME.test(name)) {
        secrets.add(value);
      }
    }
  }
  for (const name of config.envKeys ?? []) {
    const value = env[name];
    if (value) secrets.add(value);
  }
  for (const value of config.envValues ?? []) {
    if (value) secrets.add(value);
  }

  // Longest first so a longer secret is masked before a shorter substring of it.
  return [...secrets].sort((a, b) => b.length - a.length);
}

function withGlobal(re: RegExp): RegExp {
  return re.flags.includes('g') ? re : new RegExp(re.source, `${re.flags}g`);
}

function redactString(value: string, literals: string[], patterns: RegExp[], mask: string): string {
  let out = value;
  for (const literal of literals) {
    if (literal) out = out.split(literal).join(mask);
  }
  for (const pattern of patterns) {
    out = out.replace(withGlobal(pattern), () => mask);
  }
  return out;
}

function deepRedact(
  value: unknown,
  literals: string[],
  patterns: RegExp[],
  mask: string,
): unknown {
  if (typeof value === 'string') return redactString(value, literals, patterns, mask);
  if (Array.isArray(value)) return value.map((item) => deepRedact(item, literals, patterns, mask));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = deepRedact(item, literals, patterns, mask);
    }
    return out;
  }
  return value;
}

/**
 * Return a copy of `event` with secrets scrubbed from its `data`. Does not mutate
 * the input. Base fields (`id`, `session`, `agent`, ...) are left untouched. The
 * event's narrowed type is preserved for callers.
 */
export function redact<E extends AgentEvent>(event: E, config: RedactConfig = {}): E {
  if (config.enabled === false) return event;

  const mask = config.mask ?? DEFAULT_MASK;
  const literals = collectLiteralSecrets(config);
  const patterns = [...DEFAULT_PATTERNS, ...(config.patterns ?? [])];

  const data = deepRedact(event.data, literals, patterns, mask) as E['data'];
  return { ...event, data } as E;
}
