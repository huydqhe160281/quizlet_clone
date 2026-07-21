import { describe, expect, it } from 'vitest';
import { APP_LOCALE_COOKIE } from '../constants';
import { APP_LOCALE_HEADER } from '../getRequestLocale';
import { planRequestLocale } from '../middleware-locale';

describe('middleware locale planning', () => {
  it('Scenario: Guest with valid cookie', () => {
    const plan = planRequestLocale({ cookieLocale: 'en', acceptLanguage: 'vi' });
    expect(plan.locale).toBe('en');
    expect(plan.refreshCookie).toBe(false);
    expect(plan.headerName).toBe(APP_LOCALE_HEADER);
    expect(plan.cookieName).toBe(APP_LOCALE_COOKIE);
  });

  it('Scenario: Guest without cookie falls back to Accept-Language', () => {
    const plan = planRequestLocale({ acceptLanguage: 'ja-JP,ja;q=0.9' });
    expect(plan.locale).toBe('ja');
    expect(plan.refreshCookie).toBe(true);
  });

  it('Scenario: Unsupported Accept-Language falls back to Vietnamese', () => {
    const plan = planRequestLocale({ acceptLanguage: 'es-ES,es;q=0.9' });
    expect(plan.locale).toBe('vi');
    expect(plan.refreshCookie).toBe(true);
  });

  it('refreshes cookie when value is invalid', () => {
    const plan = planRequestLocale({ cookieLocale: 'fr', acceptLanguage: 'en' });
    expect(plan.locale).toBe('en');
    expect(plan.refreshCookie).toBe(true);
  });
});
