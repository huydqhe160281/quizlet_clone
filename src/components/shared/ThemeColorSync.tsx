'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { hslTokenToHex } from '@/lib/theme/theme-color';

/**
 * Keeps `<meta name="theme-color">` equal to the active theme's `--background`, so the
 * mobile browser toolbar / installed-PWA status bar blends with the page. (The Android
 * navigation bar of an installed app ignores this tag — see the note in app/manifest.ts.)
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  // next-themes swaps the <html> class before `resolvedTheme` changes, so the tokens
  // read here already belong to the new theme.
  useEffect(() => {
    const token = getComputedStyle(document.documentElement).getPropertyValue('--background');
    const color = hslTokenToHex(token);
    if (!color) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [resolvedTheme]);

  return null;
}
