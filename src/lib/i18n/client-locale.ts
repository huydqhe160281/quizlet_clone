import { APP_LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/constants';

/** localStorage key mirrored for offline shell (cookie may be Secure-only). */
export const APP_LOCALE_STORAGE_KEY = 'app-locale';

export function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromStorage = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
    if (isLocale(fromStorage)) return fromStorage;
  } catch {
    // ignore quota / private mode
  }
  return null;
}

export function readCookieLocale(): Locale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${APP_LOCALE_COOKIE}=([^;]*)`));
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isLocale(raw) ? raw : null;
}

/** Cookie → localStorage → default (vi). Used by offline shell + client pages. */
export function resolveClientLocale(fallback: Locale = DEFAULT_LOCALE): Locale {
  return readCookieLocale() ?? readStoredLocale() ?? fallback;
}

export function persistLocaleClient(locale: Locale): void {
  if (!isLocale(locale)) return;
  const maxAge = 60 * 60 * 24 * 365;
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = [
    `${APP_LOCALE_COOKIE}=${locale}`,
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
  try {
    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}
