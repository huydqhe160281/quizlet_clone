'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LOCALES } from '@/lib/i18n/constants';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { useChangeLocale } from '@/lib/i18n/use-change-locale';

/** Compact language menu for signed-out pages; signed-in users switch on /settings. */
export function LanguageSwitcher() {
  const t = useTranslations();
  const { locale, changeLocale, pending } = useChangeLocale();

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
            onClick={() => changeLocale(code)}
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
