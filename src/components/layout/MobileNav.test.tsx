/**
 * @vitest-environment jsdom
 */
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/render-with-locale';

const pathnameMock = vi.hoisted(() => ({ current: '/dashboard' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathnameMock.current }));

import { MobileNav } from '@/components/layout/MobileNav';

describe('MobileNav', () => {
  afterEach(() => {
    cleanup();
    pathnameMock.current = '/dashboard';
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('renders the bottom nav on regular app pages', () => {
    renderWithLocale(<MobileNav />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it.each(['/sets/abc123/flashcard', '/sets/abc123/write'])(
    'is hidden on study screen %s (focus mode)',
    (path) => {
      pathnameMock.current = path;
      renderWithLocale(<MobileNav />);
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    }
  );

  it('stays visible on the set detail page', () => {
    pathnameMock.current = '/sets/abc123';
    renderWithLocale(<MobileNav />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('hides while a text field has focus on a touch device (keyboard open)', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' }));
    const input = document.createElement('input');
    document.body.appendChild(input);
    renderWithLocale(<MobileNav />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();

    act(() => input.focus());
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    act(() => input.blur());
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
