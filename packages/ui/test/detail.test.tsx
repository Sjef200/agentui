import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageBubble } from '../src/components/MessageBubble.js';
import { ToolDetail } from '../src/components/ToolDetail.js';
import { EventRow } from '../src/components/EventRow.js';
import { loadFixture } from './fixtures.js';

const basic = loadFixture('claude-code-basic.jsonl');

describe('MessageBubble role styling', () => {
  it('styles user vs assistant differently', () => {
    const { container, rerender } = render(
      <MessageBubble data={{ role: 'user', text: 'hello from user' }} />,
    );
    const userBubble = container.querySelector('[data-role="user"]');
    expect(userBubble).not.toBeNull();
    expect(userBubble!.className).toMatch(/sky/);
    expect(screen.getByText('hello from user')).toBeInTheDocument();

    rerender(<MessageBubble data={{ role: 'assistant', text: 'hi from assistant' }} />);
    const asstBubble = container.querySelector('[data-role="assistant"]');
    expect(asstBubble).not.toBeNull();
    expect(asstBubble!.className).not.toMatch(/sky/);
  });
});

describe('ToolDetail JSON rendering', () => {
  it('renders tool name + pretty-printed args for a tool_call', () => {
    const call = basic.find((e) => e.type === 'tool_call');
    if (!call || call.type !== 'tool_call') throw new Error('no tool_call');
    render(<ToolDetail data={call.data} />);
    expect(screen.getByText('Read')).toBeInTheDocument();
    // Pretty JSON puts the key on its own indented line.
    expect(screen.getByText(/"path": "src\/auth\.ts"/)).toBeInTheDocument();
  });

  it('shows ok/failed status for a tool_result', () => {
    const res = basic.find((e) => e.type === 'tool_result');
    if (!res || res.type !== 'tool_result') throw new Error('no tool_result');
    const { container } = render(<ToolDetail data={res.data} />);
    const badge = container.querySelector('[data-ok="true"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toMatch(/ok/);
  });
});

describe('EventRow expand/collapse', () => {
  it('toggles the detail view on click', async () => {
    const user = userEvent.setup();
    const fileEdit = basic.find((e) => e.type === 'file_edit')!;
    let expanded = false;
    const onToggle = (): void => {
      expanded = !expanded;
    };

    const { rerender } = render(
      <EventRow event={fileEdit} expanded={expanded} onToggle={onToggle} now={fileEdit.ts} />,
    );
    // Collapsed: no diff lines yet.
    expect(document.querySelector('[data-kind="add"]')).toBeNull();

    await user.click(screen.getByRole('button', { expanded: false }));
    rerender(<EventRow event={fileEdit} expanded={expanded} onToggle={onToggle} now={fileEdit.ts} />);

    // Expanded: the diff is shown.
    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
    expect(document.querySelector('[data-kind="add"]')).not.toBeNull();
  });
});
