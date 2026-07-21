import { describe, it, expect } from 'vitest';
import { resolveLocale } from '../resolveLocale';

describe('resolveLocale', () => {
  it('Scenario: DB preference wins over cookie', () => {
    expect(
      resolveLocale({
        dbLocale: 'ja',
        cookieLocale: 'en',
        acceptLanguage: 'en-US,en;q=0.9',
      })
    ).toBe('ja');
  });

  it('Scenario: Valid cookie used when DB is null', () => {
    expect(
      resolveLocale({
        dbLocale: null,
        cookieLocale: 'en',
        acceptLanguage: 'vi',
      })
    ).toBe('en');
  });

  it('Scenario: Accept-Language fallback to Vietnamese (e.g. es → vi)', () => {
    expect(
      resolveLocale({
        dbLocale: null,
        cookieLocale: undefined,
        acceptLanguage: 'es-ES,es;q=0.9',
      })
    ).toBe('vi');
  });

  it('Scenario: Invalid cookie ignored', () => {
    expect(
      resolveLocale({
        cookieLocale: 'fr',
        acceptLanguage: 'en-US,en;q=0.9',
      })
    ).toBe('en');
  });

  it('maps en-US Accept-Language tag to en', () => {
    expect(
      resolveLocale({
        acceptLanguage: 'en-US,en;q=0.9',
      })
    ).toBe('en');
  });

  it('prefers higher q-value among accepted supported tags', () => {
    expect(
      resolveLocale({
        acceptLanguage: 'ja;q=0.2,en;q=0.8,vi;q=0.5',
      })
    ).toBe('en');
  });
});
