import { describe, expect, it } from 'vitest';
import { planLoginLocaleSync } from '../login-sync';

describe('login locale sync', () => {
  it('Scenario: DB preference wins over guest cookie', () => {
    const plan = planLoginLocaleSync({
      dbLocale: 'ja',
      cookieLocale: 'en',
      acceptLanguage: 'en-US',
    });
    expect(plan).toEqual({ locale: 'ja', persistToDb: false });
  });

  it('Scenario: Guest cookie survives login when DB is null', () => {
    const plan = planLoginLocaleSync({
      dbLocale: null,
      cookieLocale: 'en',
      acceptLanguage: 'vi',
    });
    expect(plan).toEqual({ locale: 'en', persistToDb: true });
  });

  it('Scenario: Existing users remain null', () => {
    // Planning with null DB means "unset" — distinct from explicit vi
    const plan = planLoginLocaleSync({
      dbLocale: null,
      cookieLocale: null,
      acceptLanguage: 'vi',
    });
    expect(plan.locale).toBe('vi');
    expect(plan.persistToDb).toBe(true);
  });

  it('Scenario: New explicit Vietnamese stored distinctly', () => {
    const plan = planLoginLocaleSync({
      dbLocale: 'vi',
      cookieLocale: 'en',
      acceptLanguage: 'en',
    });
    expect(plan).toEqual({ locale: 'vi', persistToDb: false });
  });

  it('Scenario: First login with no preference uses Accept-Language', () => {
    const plan = planLoginLocaleSync({
      dbLocale: null,
      cookieLocale: null,
      acceptLanguage: 'ja-JP,ja;q=0.9',
    });
    expect(plan).toEqual({ locale: 'ja', persistToDb: true });
  });

  it('Scenario: First login with unsupported Accept-Language defaults to Vietnamese', () => {
    const plan = planLoginLocaleSync({
      dbLocale: null,
      cookieLocale: null,
      acceptLanguage: 'ko-KR,ko;q=0.9',
    });
    expect(plan).toEqual({ locale: 'vi', persistToDb: true });
  });
});
