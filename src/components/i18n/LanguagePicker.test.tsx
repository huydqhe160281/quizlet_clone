/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/render-with-locale';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'unauthenticated' }) }));

import { LanguagePicker } from '@/components/i18n/LanguagePicker';

describe('LanguagePicker', () => {
  afterEach(() => {
    cleanup();
    refresh.mockReset();
  });

  it('lists every locale in its own language and marks the active one', () => {
    renderWithLocale(<LanguagePicker />, { locale: 'en' });
    const options = screen.getAllByRole('radio');
    expect(options.map((o) => o.textContent)).toEqual(['Tiếng Việt', 'English', '日本語']);
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
  });

  it('switches locale and refreshes', async () => {
    renderWithLocale(<LanguagePicker />, { locale: 'en' });
    fireEvent.click(screen.getByRole('radio', { name: '日本語' }));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(document.cookie).toContain('app-locale=ja');
  });
});
