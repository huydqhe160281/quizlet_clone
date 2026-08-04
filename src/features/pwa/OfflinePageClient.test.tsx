/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { loadCatalog } from '@/lib/i18n/catalog';
import { APP_LOCALE_COOKIE } from '@/lib/i18n/constants';
import { OfflinePageClient } from '@/features/pwa/OfflinePageClient';

afterEach(() => {
  cleanup();
  document.cookie = `${APP_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
});

function renderOffline(locale: 'en' | 'vi' | 'ja', cookieLocale?: 'en' | 'vi' | 'ja') {
  if (cookieLocale) {
    document.cookie = `${APP_LOCALE_COOKIE}=${cookieLocale}; Path=/`;
  }
  return render(
    <LocaleProvider locale={locale} catalog={loadCatalog(locale)}>
      <OfflinePageClient />
    </LocaleProvider>
  );
}

describe('Offline page', () => {
  it('Scenario: Offline navigation shows product page', () => {
    renderOffline('en');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/offline/i);
  });

  it('Scenario: Offline page offers retry', () => {
    renderOffline('en');
    expect(screen.getByRole('button').textContent).toMatch(/try again/i);
  });

  it('Scenario: Offline page states online prerequisite', () => {
    renderOffline('en');
    expect(screen.getByText(/online at least once/i)).toBeTruthy();
  });

  it('Scenario: Offline page includes iOS install hint', () => {
    renderOffline('en');
    expect(screen.getByText(/Add to Home Screen/i)).toBeTruthy();
  });

  it('Scenario: Offline fallback respects active locale offline', () => {
    renderOffline('en', 'vi');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/ngoại tuyến/i);
    expect(screen.getByRole('button')).toHaveTextContent(/Thử lại/i);
  });

  it('Scenario: Cold first visit offline accepted', () => {
    renderOffline('en');
    expect(screen.getByText(/online at least once/i)).toBeTruthy();
    expect(screen.getByText(/network connection/i)).toBeTruthy();
  });

  it('Scenario: Retry triggers reload', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload },
    });
    const { container } = renderOffline('en');
    fireEvent.click(within(container).getByRole('button'));
    expect(reload).toHaveBeenCalled();
  });
});
