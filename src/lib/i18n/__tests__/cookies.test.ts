import { describe, expect, it } from 'vitest';
import { buildLocaleCookieHeader, parseLocaleCookieValue } from '../cookies';
import { APP_LOCALE_COOKIE } from '../constants';

describe('locale cookies', () => {
  it('Scenario: Set valid locale cookie', () => {
    const header = buildLocaleCookieHeader('ja', { secure: false });
    expect(header).toContain(`${APP_LOCALE_COOKIE}=ja`);
    expect(header).toContain('Path=/');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Max-Age=');
    expect(header).not.toContain('HttpOnly');
  });

  it('Scenario: Cookie attributes are correct', () => {
    const header = buildLocaleCookieHeader('en', { secure: false });
    expect(header).toMatch(/app-locale=en; Path=\/; SameSite=Lax; Max-Age=\d+/);
  });

  it('Scenario: Secure attribute in production', () => {
    const header = buildLocaleCookieHeader('vi', { secure: true });
    expect(header).toContain('Secure');
  });

  it('Scenario: Refuse invalid locale cookie', () => {
    expect(parseLocaleCookieValue('fr')).toBeNull();
    expect(parseLocaleCookieValue('en')).toBe('en');
  });
});
