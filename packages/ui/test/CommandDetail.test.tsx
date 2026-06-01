import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommandDetail } from '../src/components/CommandDetail.js';
import { loadFixture } from './fixtures.js';

const editHeavy = loadFixture('claude-code-edit-heavy.jsonl');

const commands = editHeavy.filter((e) => e.type === 'command');
const failing = commands.find((e) => e.type === 'command' && e.data.exitCode === 1);
const passing = commands.find((e) => e.type === 'command' && e.data.exitCode === 0);
if (!failing || failing.type !== 'command') throw new Error('fixture missing failing command');
if (!passing || passing.type !== 'command') throw new Error('fixture missing passing command');

describe('CommandDetail', () => {
  it('shows the command, cwd, exit code and stdout', () => {
    render(<CommandDetail data={failing.data} />);
    expect(screen.getByText(/pnpm test rate-limit/)).toBeInTheDocument();
    expect(screen.getByText(/\/home\/user\/acme-api/)).toBeInTheDocument();
    expect(screen.getByText(/exit 1/)).toBeInTheDocument();
    expect(screen.getByText(/FAIL src\/middleware\/rate-limit\.test\.ts/)).toBeInTheDocument();
  });

  it('applies error styling to the exit code and stderr on a nonzero exit', () => {
    const { container } = render(<CommandDetail data={failing.data} />);
    const code = container.querySelector('[data-failed="true"]');
    expect(code).not.toBeNull();
    expect(code!.className).toMatch(/red/);

    // stderr stream is rendered in red for a failing command.
    const stderr = screen.getByText(/AssertionError: expected 429, got 200/);
    expect(stderr.className).toMatch(/red/);
  });

  it('does not apply error styling for a zero exit', () => {
    const { container } = render(<CommandDetail data={passing.data} />);
    const code = container.querySelector('[data-failed="false"]');
    expect(code).not.toBeNull();
    expect(code!.className).toMatch(/emerald/);
  });
});
