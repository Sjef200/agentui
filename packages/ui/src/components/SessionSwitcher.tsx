import type { SessionMeta } from '../lib/server.js';

export interface SessionSwitcherProps {
  sessions: readonly SessionMeta[];
  /** Currently selected session id, or undefined for "most recent". */
  value?: string;
  onChange: (id: string) => void;
}

/**
 * A dropdown to switch the observed session. Data (the session list) is passed
 * via props; the parent fetches it from `GET /sessions`.
 */
export function SessionSwitcher({ sessions, value, onChange }: SessionSwitcherProps): JSX.Element {
  return (
    <label className="flex items-center gap-2 text-xs text-zinc-400">
      <span className="hidden sm:inline">Session</span>
      <select
        aria-label="Session"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[16rem] truncate rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-200 focus:border-sky-500/60 focus:outline-none"
      >
        {sessions.length === 0 && <option value="">No sessions</option>}
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.id} · {s.agent} ({s.eventCount})
          </option>
        ))}
      </select>
    </label>
  );
}
