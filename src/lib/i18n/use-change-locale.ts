'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTransition } from 'react';
import { type Locale } from '@/lib/i18n/constants';
import { persistLocaleClient } from '@/lib/i18n/client-locale';
import { useLocale } from '@/lib/i18n/LocaleProvider';

/**
 * Switches the UI locale: writes the cookie at once, saves it to the account when signed
 * in, then soft-refreshes so server components re-render in the new language.
 */
export function useChangeLocale() {
  const locale = useLocale();
  const router = useRouter();
  const { status } = useSession();
  const [pending, startTransition] = useTransition();

  const changeLocale = (next: Locale) => {
    if (next === locale || pending) return;
    persistLocaleClient(next);

    startTransition(async () => {
      if (status === 'authenticated') {
        try {
          await fetch('/api/v1/user/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferredLocale: next }),
          });
        } catch {
          // Soft-fail: the cookie is already updated, so the refresh still applies it.
        }
      }
      router.refresh();
    });
  };

  return { locale, changeLocale, pending };
}
