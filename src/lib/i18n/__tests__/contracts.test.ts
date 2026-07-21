import { describe, expect, it } from 'vitest';
import { resolveLocale } from '../resolveLocale';
import { assertSameOrigin } from '../origin';
import { ApiError } from '@/lib/api-error';
import { env } from '@/config/env';

describe('i18n contracts', () => {
  it('asserts preferredLocale=ja + app-locale=en resolves to ja', () => {
    expect(
      resolveLocale({
        dbLocale: 'ja',
        cookieLocale: 'en',
        acceptLanguage: 'en-US',
      })
    ).toBe('ja');
  });

  it('Scenario: Mismatched origin rejected', () => {
    const request = new Request('https://example.com/api', {
      headers: { origin: 'https://evil.example' },
    });
    expect(() => assertSameOrigin(request)).toThrow(ApiError);
    try {
      assertSameOrigin(request);
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
    }
  });

  it('Scenario: Same origin allowed', () => {
    const request = new Request('https://example.com/api', {
      headers: { origin: env.authUrl },
    });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it('Scenario: No origin header allowed', () => {
    const request = new Request('https://example.com/api');
    expect(() => assertSameOrigin(request)).not.toThrow();
  });
});
