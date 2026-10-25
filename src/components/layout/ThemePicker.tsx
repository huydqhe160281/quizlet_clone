'use client';

import { Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { THEME_ICONS } from '@/components/layout/theme-icons';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import {
  SYSTEM_THEME,
  THEME_CHOICES,
  getThemeLabelKey,
  type ThemeChoice,
} from '@/lib/theme/themes';
import { cn } from '@/lib/utils';

/** A miniature page drawn with the theme's own tokens (its class scopes them). */
function ThemePreview({ theme }: { theme: string }) {
  return (
    <span
      className={cn(
        theme,
        'flex h-full w-full flex-col gap-1.5 bg-background p-2.5 text-foreground'
      )}
      aria-hidden
    >
      <span className="h-1.5 w-1/2 rounded-full bg-foreground/70" />
      <span className="flex flex-1 flex-col justify-end gap-1 rounded-md border border-border bg-card p-1.5">
        <span className="h-1 w-3/4 rounded-full bg-muted-foreground/40" />
        <span className="h-1 w-1/2 rounded-full bg-muted-foreground/40" />
      </span>
      <span className="h-2.5 w-2/5 rounded-full bg-primary" />
    </span>
  );
}

function ThemeSwatch({ choice }: { choice: ThemeChoice }) {
  if (choice !== SYSTEM_THEME) return <ThemePreview theme={choice} />;
  // System: light and dark previews side by side.
  return (
    <span className="grid h-full w-full grid-cols-2">
      <ThemePreview theme="light" />
      <ThemePreview theme="dark" />
    </span>
  );
}

/**
 * Theme gallery for the settings page. Every theme in the registry shows up
 * automatically, previewed with its real tokens rather than hard-coded colours.
 */
export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations();

  return (
    <div
      role="radiogroup"
      aria-label={t('ui.theme.label')}
      className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3', className)}
    >
      {THEME_CHOICES.map((choice) => {
        const Icon = THEME_ICONS[choice];
        const active = theme === choice;
        return (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(choice)}
            className={cn(
              'group flex min-w-0 flex-col overflow-hidden rounded-xl border-2 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active ? 'border-primary' : 'border-border hover:border-primary/40'
            )}
          >
            <span className="block aspect-[16/10] w-full overflow-hidden border-b border-border">
              <ThemeSwatch choice={choice} />
            </span>
            <span className="flex items-center gap-2 bg-card px-2.5 py-2 text-xs font-semibold text-card-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{t(getThemeLabelKey(choice))}</span>
              {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
