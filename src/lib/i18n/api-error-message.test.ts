import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from '@/lib/i18n/api-error-message';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t as translate } from '@/lib/i18n/t';

const vi = loadCatalog('vi');
const t = (key: string, values?: Record<string, string | number>) => translate(vi, key, values);

describe('apiErrorMessage', () => {
  it('translates a known error code instead of showing the English server message', () => {
    expect(
      apiErrorMessage(
        t,
        { error: 'EMAIL_ALREADY_EXISTS', message: 'Email already registered' },
        'auth.registerFailed'
      )
    ).toBe(t('apiErrors.EMAIL_ALREADY_EXISTS'));
  });

  it('falls back to the caller message for unknown codes and never echoes raw text', () => {
    expect(
      apiErrorMessage(t, { error: 'SOMETHING_NEW', message: 'raw english' }, 'auth.registerFailed')
    ).toBe(t('auth.registerFailed'));
    expect(apiErrorMessage(t, null, 'auth.resetFailed')).toBe(t('auth.resetFailed'));
  });

  it('can pass through a message the server already localized', () => {
    expect(
      apiErrorMessage(t, { message: 'Đã localize' }, 'auth.requestFailed', { trustMessage: true })
    ).toBe('Đã localize');
  });
});

describe('error catalogs', () => {
  it.each(['vi', 'en', 'ja'])(
    '%s has every API error, error page and nav.userMenu key',
    (locale) => {
      const catalog = loadCatalog(locale);
      const english = loadCatalog('en') as { apiErrors: Record<string, string> };
      for (const code of Object.keys(english.apiErrors)) {
        expect(translate(catalog, `apiErrors.${code}`)).not.toBe(`apiErrors.${code}`);
      }
      for (const key of ['nav.userMenu', 'errorPage.title', 'errorPage.notFoundTitle']) {
        expect(translate(catalog, key)).not.toBe(key);
      }
    }
  );
});
