'use client';

import { useTheme } from 'next-themes';
import { THEME_ICONS } from '@/components/layout/theme-icons';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { SYSTEM_THEME, THEME_CHOICES, getThemeLabelKey } from '@/lib/theme/themes';
import { cn } from '@/lib/utils';

/**
 * Inline theme switcher (swatch tiles). Used inside the mobile avatar menu,
 * where a nested dropdown would be awkward to reach with a thumb.
 *
 * Each swatch carries its theme's class, so it previews the theme's real
 * background/primary tokens instead of hard-coded colours.
 */
export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations();

  return (
    <div
      role="radiogroup"
      aria-label={t('ui.theme.label')}
      className={cn('grid grid-cols-3 gap-1.5', className)}
    >
      {THEME_CHOICES.map((choice) => {
        const Icon = THEME_ICONS[choice];
        const active = theme === choice;
        const isSystem = choice === SYSTEM_THEME;
        return (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(choice)}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 rounded-lg p-1.5 text-[10px] font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <span
              className={cn(
                'rounded-full shadow-sm',
                active && 'ring-2 ring-primary ring-offset-1 ring-offset-popover'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border border-border',
                  isSystem
                    ? 'bg-[linear-gradient(135deg,#ffffff_50%,#18181b_50%)] text-zinc-500 [&>svg]:mix-blend-difference'
                    : [choice, 'bg-background text-primary']
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
            </span>
            <span className="line-clamp-2 w-full break-words text-center leading-tight">
              {t(getThemeLabelKey(choice))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
