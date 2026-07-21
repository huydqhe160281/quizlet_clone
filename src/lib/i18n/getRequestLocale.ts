import { headers, cookies } from 'next/headers';
import { APP_LOCALE_COOKIE, DEFAULT_LOCALE, type Locale, isLocale } from '@/lib/i18n/constants';

export const APP_LOCALE_HEADER = 'x-app-locale';

export async function getRequestLocale(): Promise<Locale> {
  const headerStore = await headers();
  const fromHeader = headerStore.get(APP_LOCALE_HEADER);
  if (isLocale(fromHeader)) {
    return fromHeader;
  }

  const jar = await cookies();
  const fromCookie = jar.get(APP_LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) {
    return fromCookie;
  }

  return DEFAULT_LOCALE;
}
