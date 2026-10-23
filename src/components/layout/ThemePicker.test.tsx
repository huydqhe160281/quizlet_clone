/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/render-with-locale';

const themeMock = vi.hoisted(() => ({ theme: 'pastel', setTheme: vi.fn() }));
vi.mock('next-themes', () => ({ useTheme: () => themeMock }));

import { ThemePicker } from '@/components/layout/ThemePicker';

describe('ThemePicker', () => {
  afterEach(() => {
    cleanup();
    themeMock.setTheme.mockReset();
  });

  it('offers all four themes and marks the active one', () => {
    renderWithLocale(<ThemePicker />);
    const options = screen.getAllByRole('radio');
    expect(options).toHaveLength(4);
    expect(options.filter((o) => o.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: /pastel/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('switches theme on tap', () => {
    renderWithLocale(<ThemePicker />);
    fireEvent.click(screen.getAllByRole('radio')[1]);
    expect(themeMock.setTheme).toHaveBeenCalledWith('dark');
  });
});
