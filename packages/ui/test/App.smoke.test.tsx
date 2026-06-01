import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App.js';
import { Timeline } from '../src/components/Timeline.js';
import { loadFixture } from './fixtures.js';

const events = loadFixture('claude-code-basic.jsonl');
// A fixed "now" just past the last event so relative times are deterministic.
const NOW = events[events.length - 1]!.ts + 1000;

describe('App smoke (fixture events as props, no server)', () => {
  it('parses + validates the fixture into a non-trivial session', () => {
    expect(events.length).toBeGreaterThanOrEqual(10);
    expect(events.some((e) => e.type === 'file_edit')).toBe(true);
    expect(events.some((e) => e.type === 'command')).toBe(true);
  });

  it('renders the App with injected events without crashing', () => {
    render(<App events={events} sessions={[]} now={NOW} />);
    expect(screen.getByRole('heading', { name: /agent ui/i })).toBeInTheDocument();
    // The status pill shows "static" when events are injected (no live stream).
    expect(screen.getByTestId('stream-status')).toHaveTextContent(/static/i);
  });

  it('renders several timeline rows from the fixture', () => {
    render(<Timeline events={events} now={NOW} initialRect={{ width: 1200, height: 2000 }} />);
    const rows = screen.getAllByRole('button', { expanded: false });
    // Every event row is a collapsed button; expect most of the fixture to render.
    expect(rows.length).toBeGreaterThanOrEqual(6);
  });

  it('shows recognizable summaries (session title, a command)', () => {
    render(<Timeline events={events} now={NOW} initialRect={{ width: 1200, height: 2000 }} />);
    expect(screen.getByText('Fix failing auth test')).toBeInTheDocument();
    // The fixture runs `pnpm test auth` twice (fail then pass).
    const commandRows = screen.getAllByText(/pnpm test auth/);
    expect(commandRows.length).toBeGreaterThanOrEqual(1);
  });
});
