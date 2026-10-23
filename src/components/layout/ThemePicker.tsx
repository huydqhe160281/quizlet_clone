'use client';

import { Monitor, Moon, Palette, Sun, type LucideIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type ThemeOption = {
  value: 'light' | 'dark' | 'pastel' | 'system';
  labelKey: string;
  icon: LucideIcon;
  /** Mini preview of the theme's base + accent colours. */
  swatchClass: string;
  iconClass: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    labelKey: 'ui.theme.light',
    icon: Sun,
    swatchClass: 'bg-white',
    iconClass: 'text-amber-500',
  },
  {
    value: 'dark',
    labelKey: 'ui.theme.dark',
    icon: Moon,
    swatchClass: 'bg-zinc-900',
    iconClass: 'text-indigo-300',
  },
  {
    value: 'pastel',
    labelKey: 'ui.theme.pastel',
    icon: Palette,
    swatchClass: 'bg-gradient-to-br from-orange-100 via-rose-100 to-sky-200',
    iconClass: 'text-orange-600',
  },
  {
    value: 'system',
    labelKey: 'ui.theme.system',
    icon: Monitor,
    swatchClass: 'bg-[linear-gradient(135deg,#ffffff_50%,#18181b_50%)]',
    iconClass: 'text-zinc-500 mix-blend-difference',
  },
];

/**
 * Inline four-way theme switcher (swatch tiles). Used inside the mobile avatar
 * menu, where a nested dropdown would be awkward to reach with a thumb.
 */
export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations();

  return (
    <div
      role="radiogroup"
      aria-label={t('ui.theme.label')}
      className={cn('grid grid-cols-4 gap-1.5', className)}
    >
      {THEME_OPTIONS.map(({ value, labelKey, icon: Icon, swatchClass, iconClass }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 rounded-lg p-1.5 text-[10px] font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border border-border shadow-sm',
                swatchClass,
                active && 'ring-2 ring-primary ring-offset-1 ring-offset-popover'
              )}
            >
              <Icon className={cn('h-4 w-4', iconClass)} />
            </span>
            <span className="w-full truncate text-center">{t(labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
