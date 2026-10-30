/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { THEME_BACKGROUNDS, THEME_COLOR_BOOT_SCRIPT, hslTokenToHex } from './theme-color';
import { THEME_IDS } from './themes';
import { readThemeTokens } from '@/test/theme-tokens';

describe('hslTokenToHex', () => {
  it('converts shadcn HSL tokens to hex', () => {
    expect(hslTokenToHex('0 0% 100%')).toBe('#ffffff');
    expect(hslTokenToHex('0 0% 0%')).toBe('#000000');
    expect(hslTokenToHex('0 100% 50%')).toBe('#ff0000');
    expect(hslTokenToHex('47 47% 96%')).toBe('#faf8f0');
    expect(hslTokenToHex(' 240 10% 4% ')).toBe('#09090b');
  });

  it('rejects values that are not an HSL token', () => {
    expect(hslTokenToHex('')).toBeNull();
    expect(hslTokenToHex('#fff')).toBeNull();
    expect(hslTokenToHex('hsl(0 0% 100%)')).toBeNull();
  });

  it.each(THEME_IDS)('THEME_BACKGROUNDS.%s mirrors its --background token', (themeId) => {
    const expected = hslTokenToHex(readThemeTokens(themeId).background ?? '');
    expect(THEME_BACKGROUNDS[themeId]).toBe(expected);
  });
});

describe('THEME_COLOR_BOOT_SCRIPT', () => {
  const run = (stored: string | null) => {
    document.head.innerHTML =
      '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fcfcfd">';
    localStorage.clear();
    if (stored) localStorage.setItem('flashcards-theme', stored);
    new Function(THEME_COLOR_BOOT_SCRIPT)();
    return document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  };

  it('prepends the saved theme colour so it wins over the media-query metas', () => {
    const first = run('paper');
    expect(first?.content).toBe(THEME_BACKGROUNDS.paper);
    expect(first?.hasAttribute('media')).toBe(false);
  });

  it('leaves the server metas alone for "system" or no saved theme', () => {
    expect(run('system')?.getAttribute('media')).not.toBeNull();
    expect(run(null)?.getAttribute('media')).not.toBeNull();
  });
});
