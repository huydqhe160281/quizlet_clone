import { describe, expect, it } from 'vitest';
import en from '../../../messages/en/ui.json';
import ja from '../../../messages/ja/ui.json';
import vi from '../../../messages/vi/ui.json';
import {
  DARK_THEME_IDS,
  THEME_CHOICES,
  getThemeColorScheme,
  getThemeLabelKey,
} from '@/lib/theme/themes';

describe('theme registry', () => {
  it('maps themes onto the light/dark scheme', () => {
    expect(getThemeColorScheme('pastel')).toBe('light');
    expect(getThemeColorScheme('paper-dark')).toBe('dark');
    expect(getThemeColorScheme('system')).toBe('system');
    expect(getThemeColorScheme(undefined)).toBe('system');
  });

  it('treats every dark-scheme theme as dark for Tailwind', () => {
    expect(DARK_THEME_IDS).toEqual(['dark', 'paper-dark']);
  });

  it.each([
    ['vi', vi],
    ['en', en],
    ['ja', ja],
  ])('has a %s label for every theme choice', (_locale, catalog) => {
    const labels = catalog.ui.theme as Record<string, string>;
    for (const choice of THEME_CHOICES) {
      const key = getThemeLabelKey(choice).replace('ui.theme.', '');
      expect(labels[key], choice).toBeTruthy();
    }
  });
});
