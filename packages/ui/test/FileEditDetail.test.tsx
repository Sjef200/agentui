import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileEditDetail } from '../src/components/FileEditDetail.js';
import { loadFixture } from './fixtures.js';

const events = loadFixture('claude-code-basic.jsonl');
const edit = events.find((e) => e.type === 'file_edit');
if (!edit || edit.type !== 'file_edit') throw new Error('fixture missing file_edit');

describe('FileEditDetail', () => {
  it('renders the edited path', () => {
    render(<FileEditDetail data={edit.data} />);
    expect(screen.getByText('src/auth.ts')).toBeInTheDocument();
  });

  it('renders the added line in green (add kind) and removed in red (del kind)', () => {
    const { container } = render(<FileEditDetail data={edit.data} />);

    const added = container.querySelector('[data-kind="add"]');
    const removed = container.querySelector('[data-kind="del"]');

    expect(added).not.toBeNull();
    expect(removed).not.toBeNull();

    // The basic fixture flips `<` to `>` in the expiry check.
    expect(added!.textContent).toContain('return token.expiresAt > Date.now();');
    expect(removed!.textContent).toContain('return token.expiresAt < Date.now();');

    // Color styling: adds use emerald, dels use red.
    expect(added!.className).toMatch(/emerald/);
    expect(removed!.className).toMatch(/red/);
  });

  it('marks @@ hunk headers and +++/--- file headers as dimmed meta/hunk', () => {
    const { container } = render(<FileEditDetail data={edit.data} />);
    expect(container.querySelector('[data-kind="hunk"]')).not.toBeNull();
    expect(container.querySelector('[data-kind="meta"]')).not.toBeNull();
  });
});
