import { cookies } from 'next/headers';
import { APP_LOCALE_COOKIE, DEFAULT_LOCALE, type Locale, isLocale } from '@/lib/i18n/constants';
import { env } from '@/config/env';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type LocaleCookieOptions = {
  secure?: boolean;
  maxAge?: number;
};

export function buildLocaleCookieHeader(locale: Locale, options: LocaleCookieOptions = {}): string {
  const secure = options.secure ?? env.nodeEnv === 'production';
  const maxAge = options.maxAge ?? ONE_YEAR_SECONDS;
  const parts = [`${APP_LOCALE_COOKIE}=${locale}`, 'Path=/', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function parseLocaleCookieValue(value: string | undefined | null): Locale | null {
  if (!value) return null;
  return isLocale(value) ? value : null;
}

/** Read locale cookie in Server Components / Route Handlers. */
export async function getLocaleCookie(): Promise<Locale | null> {
  const jar = await cookies();
  return parseLocaleCookieValue(jar.get(APP_LOCALE_COOKIE)?.value);
}

/** Write locale cookie in Server Components / Route Handlers. */
export async function setLocaleCookie(locale: Locale): Promise<void> {
  if (!isLocale(locale)) {
    throw new Error(`Invalid locale cookie value: ${String(locale)}`);
  }
  const jar = await cookies();
  jar.set(APP_LOCALE_COOKIE, locale, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure: env.nodeEnv === 'production',
    maxAge: ONE_YEAR_SECONDS,
  });
}

export function resolveCookieOrDefault(value: string | undefined | null): Locale {
  return parseLocaleCookieValue(value) ?? DEFAULT_LOCALE;
}
