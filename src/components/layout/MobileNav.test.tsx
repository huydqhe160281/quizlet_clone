/**
 * @vitest-environment jsdom
 */
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/render-with-locale';

const pathnameMock = vi.hoisted(() => ({ current: '/dashboard' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathnameMock.current }));

import { MobileNav } from '@/components/layout/MobileNav';

describe('MobileNav', () => {
  afterEach(() => {
    cleanup();
    pathnameMock.current = '/dashboard';
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
});
