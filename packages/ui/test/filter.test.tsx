import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App.js';
import { FilterBar } from '../src/components/FilterBar.js';
import { applyFilter, EMPTY_FILTER, type EventFilter } from '../src/lib/filter.js';
import { loadFixture } from './fixtures.js';

const events = loadFixture('claude-code-basic.jsonl');
const NOW = events[events.length - 1]!.ts + 1000;

describe('applyFilter (pure)', () => {
  it('text filter narrows to matching events', () => {
    const filter: EventFilter = { ...EMPTY_FILTER, text: 'inverted' };
    const out = applyFilter(events, filter);
    // Only the assistant message saying the comparison is "inverted" matches.
    expect(out.length).toBe(1);
    expect(out[0]!.type).toBe('message');
    // And it genuinely narrows vs. the full list.
    expect(out.length).toBeLessThan(events.length);
  });

  it('type toggle narrows to the enabled types only', () => {
    const filter: EventFilter = { text: '', enabledTypes: new Set(['command']) };
    const out = applyFilter(events, filter);
    expect(out.length).toBe(2); // two commands in the basic fixture
    expect(out.every((e) => e.type === 'command')).toBe(true);
  });

  it('empty filter passes everything through', () => {
    expect(applyFilter(events, EMPTY_FILTER).length).toBe(events.length);
  });
});

/** The filter chip for a type. Chips carry `aria-pressed`; rows carry `data-event-id`. */
function chip(container: HTMLElement, type: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`button[data-type="${type}"][aria-pressed]`);
  if (!el) throw new Error(`no chip for type ${type}`);
  return el;
}

describe('FilterBar interactions narrow the rendered timeline (via App)', () => {
  function countRows(): number {
    return screen.queryAllByRole('button', { expanded: false }).filter((el) => el.hasAttribute('data-event-id')).length;
  }

  it('typing in the text filter reduces the rendered rows', async () => {
    const user = userEvent.setup();
    // Render App with injected events; reach inside Timeline via a wide rect by
    // rendering the full App (Timeline uses its default rect which fits 12 rows).
    render(<App events={events} sessions={[]} now={NOW} />);

    const before = countRows();
    expect(before).toBeGreaterThanOrEqual(6);

    await user.type(screen.getByLabelText(/filter events/i), 'inverted');
    const after = countRows();
    expect(after).toBe(1);
    expect(after).toBeLessThan(before);
  });

  it('clicking a type chip narrows to that type', async () => {
    const user = userEvent.setup();
    const { container } = render(<App events={events} sessions={[]} now={NOW} />);

    const before = countRows();
    // With an empty set = all-enabled, the first click enables ONLY command.
    await user.click(chip(container, 'command'));
    const after = countRows();
    expect(after).toBe(2);
    expect(after).toBeLessThan(before);
  });
});

describe('FilterBar (controlled, standalone)', () => {
  it('reports text changes and type toggles to onChange', async () => {
    const user = userEvent.setup();
    let current: EventFilter = EMPTY_FILTER;
    const onChange = (f: EventFilter): void => {
      current = f;
    };

    const { rerender, container } = render(
      <FilterBar filter={current} onChange={onChange} counts={{ command: 2 }} />,
    );

    await user.type(screen.getByLabelText(/filter events/i), 'a');
    expect(current.text).toBe('a');

    rerender(<FilterBar filter={current} onChange={onChange} />);
    await user.click(chip(container, 'command'));
    expect(current.enabledTypes.has('command')).toBe(true);
  });
});
