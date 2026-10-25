'use client';

import { Check } from 'lucide-react';
import { SUPPORTED_LOCALES } from '@/lib/i18n/constants';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { useChangeLocale } from '@/lib/i18n/use-change-locale';
import { cn } from '@/lib/utils';

/** Language list for the settings page; each name is shown in its own language. */
export function LanguagePicker() {
  const t = useTranslations();
  const { locale, changeLocale, pending } = useChangeLocale();

  return (
    <div
      role="radiogroup"
      aria-label={t('nav.language')}
      aria-busy={pending}
      className="grid gap-2 sm:grid-cols-3"
    >
      {SUPPORTED_LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            lang={code}
            disabled={pending}
            onClick={() => changeLocale(code)}
            className={cn(
              'flex min-h-11 items-center justify-between gap-2 rounded-xl border-2 px-4 py-2.5 text-left text-sm font-semibold transition-colors disabled:opacity-60',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            <span className="truncate">{t(`language.${code}`)}</span>
            {active && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
