'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/constants';
import { persistLocaleClient } from '@/lib/i18n/client-locale';
import { useLocale, useTranslations } from '@/lib/i18n/LocaleProvider';

function writeLocaleCookie(locale: Locale) {
  persistLocaleClient(locale);
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const [pending, startTransition] = useTransition();

  const onSelect = (next: Locale) => {
    if (next === locale || pending) return;

    const inStudySession = pathname.startsWith('/study');
    writeLocaleCookie(next);

    startTransition(() => {
      void (async () => {
        if (status === 'authenticated') {
          try {
            await fetch('/api/v1/user/preferences', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ preferredLocale: next }),
            });
          } catch {
            // Soft-fail: cookie already updated; refresh still applies UI locale.
          }
        }

        if (inStudySession) {
          // Soft refresh is allowed mid-study; hard reload would need confirmation.
          router.refresh();
          return;
        }

        router.refresh();
      })();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl font-semibold"
          aria-label={t('nav.language')}
          disabled={pending}
        >
          {t(`language.${locale}`)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => onSelect(code)}
            aria-pressed={code === locale}
            className={code === locale ? 'font-bold' : undefined}
          >
            {t(`language.${code}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
