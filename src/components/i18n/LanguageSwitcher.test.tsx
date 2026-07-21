/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { loadCatalog } from '@/lib/i18n/catalog';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => '/dashboard',
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: 'unauthenticated', data: null }),
}));

describe('LanguageSwitcher', () => {
  it('Scenario: Switcher is visible', () => {
    const catalog = loadCatalog('vi');
    render(
      <LocaleProvider locale="vi" catalog={catalog}>
        <LanguageSwitcher />
      </LocaleProvider>
    );
    expect(screen.getByLabelText('Ngôn ngữ')).toBeTruthy();
  });

  it('Scenario: Current locale highlighted', () => {
    const catalog = loadCatalog('en');
    render(
      <LocaleProvider locale="en" catalog={catalog}>
        <LanguageSwitcher />
      </LocaleProvider>
    );
    expect(screen.getByLabelText('Language').textContent).toContain('English');
  });

  it('Scenario: Provider supplies active locale', () => {
    const catalog = loadCatalog('ja');
    render(
      <LocaleProvider locale="ja" catalog={catalog}>
        <LanguageSwitcher />
      </LocaleProvider>
    );
    expect(screen.getByLabelText('言語').textContent).toContain('日本語');
  });
});
