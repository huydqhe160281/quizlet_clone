'use client';

import * as React from 'react';
import { SunMoon } from 'lucide-react';
import { useTheme } from 'next-themes';

import { THEME_ICONS } from '@/components/layout/theme-icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { THEME_CHOICES, getThemeLabelKey, type ThemeChoice } from '@/lib/theme/themes';

const subscribeNoop = () => () => {};

/** False during SSR and hydration, true afterwards — the theme is only known on the client. */
function useIsClient() {
  return React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations();
  const isClient = useIsClient();

  // `resolvedTheme` turns `system` into light/dark, so the trigger shows what is on screen.
  const ActiveIcon =
    isClient && resolvedTheme ? (THEME_ICONS[resolvedTheme as ThemeChoice] ?? SunMoon) : SunMoon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <ActiveIcon className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('ui.theme.toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_CHOICES.map((choice) => {
          const Icon = THEME_ICONS[choice];
          return (
            <DropdownMenuItem key={choice} onClick={() => setTheme(choice)} className="gap-2">
              <Icon className="h-4 w-4" />
              {t(getThemeLabelKey(choice))}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
