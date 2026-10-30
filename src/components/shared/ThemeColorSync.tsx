'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { THEME_BACKGROUNDS, applyThemeColor } from '@/lib/theme/theme-color';

/**
 * Keeps `<meta name="theme-color">` equal to the active theme's background when the user
 * switches themes, so the mobile browser toolbar / installed-PWA status bar blends with
 * the page. The first paint is handled server-side (layout `viewport.themeColor` + boot
 * script). The Android navigation bar of an installed app ignores this tag — see the note
 * in app/manifest.ts.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = THEME_BACKGROUNDS[resolvedTheme as keyof typeof THEME_BACKGROUNDS];
    if (color) applyThemeColor(color);
  }, [resolvedTheme]);

  return null;
}
