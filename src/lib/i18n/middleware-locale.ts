import { APP_LOCALE_COOKIE, isLocale, type Locale } from '@/lib/i18n/constants';
import { resolveLocale } from '@/lib/i18n/resolveLocale';
import { APP_LOCALE_HEADER } from '@/lib/i18n/getRequestLocale';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type LocaleMiddlewarePlan = {
  locale: Locale;
  refreshCookie: boolean;
  headerName: typeof APP_LOCALE_HEADER;
  cookieName: typeof APP_LOCALE_COOKIE;
  cookieMaxAge: number;
};

/** Pure locale planning used by middleware (easy to unit-test). */
export function planRequestLocale(input: {
  cookieLocale?: string;
  acceptLanguage?: string | null;
}): LocaleMiddlewarePlan {
  const locale = resolveLocale({
    dbLocale: null,
    cookieLocale: input.cookieLocale,
    acceptLanguage: input.acceptLanguage ?? undefined,
  });

  return {
    locale,
    refreshCookie: !isLocale(input.cookieLocale) || input.cookieLocale !== locale,
    headerName: APP_LOCALE_HEADER,
    cookieName: APP_LOCALE_COOKIE,
    cookieMaxAge: ONE_YEAR_SECONDS,
  };
}
