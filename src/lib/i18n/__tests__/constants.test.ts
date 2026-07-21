import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  APP_LOCALE_COOKIE,
  OG_LOCALE_MAP,
  isLocale,
} from '../constants';

describe('i18n constants', () => {
  it('Scenario: Valid constants', () => {
    expect(SUPPORTED_LOCALES).toEqual(['vi', 'en', 'ja']);
    expect(DEFAULT_LOCALE).toBe('vi');
    expect(APP_LOCALE_COOKIE).toBe('app-locale');
    expect(OG_LOCALE_MAP).toEqual({
      vi: 'vi_VN',
      en: 'en_US',
      ja: 'ja_JP',
    });
  });

  it('Scenario: Reject unsupported locale values', () => {
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('vi')).toBe(true);
  });
});
