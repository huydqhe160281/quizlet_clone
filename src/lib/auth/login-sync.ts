/**
 * Login-time locale sync.
 *
 * Hook location: wired from NextAuth `events.signIn` in `src/server/auth/auth.ts`
 * (not a separate post-login route). This module stays pure so it is unit-testable;
 * the event handler performs Prisma/cookie I/O.
 *
 * Rules (ADR-002):
 * 1. DB preferredLocale non-null → use DB (authoritative)
 * 2. DB null + valid cookie → persist cookie to DB
 * 3. both missing → Accept-Language → vi; optionally persist
 */

import { type Locale, isLocale } from '@/lib/i18n/constants';
import { resolveLocale } from '@/lib/i18n/resolveLocale';

export type LoginSyncInput = {
  dbLocale: Locale | null | undefined;
  cookieLocale: string | null | undefined;
  acceptLanguage: string | null | undefined;
};

export type LoginSyncPlan = {
  locale: Locale;
  /** When true, write `locale` into User.preferredLocale */
  persistToDb: boolean;
};

export function planLoginLocaleSync(input: LoginSyncInput): LoginSyncPlan {
  if (isLocale(input.dbLocale)) {
    return { locale: input.dbLocale, persistToDb: false };
  }

  if (isLocale(input.cookieLocale)) {
    return { locale: input.cookieLocale, persistToDb: true };
  }

  const locale = resolveLocale({
    dbLocale: null,
    cookieLocale: null,
    acceptLanguage: input.acceptLanguage,
  });

  return { locale, persistToDb: true };
}
