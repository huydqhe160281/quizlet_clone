import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { OFFLINE_FALLBACK_PATH } from '@/features/pwa/sw-policy';
import { loadCatalog } from '@/lib/i18n/catalog';
import { THEME_IDS } from '@/lib/theme/themes';
import { hslTokenToHex } from '@/lib/theme/theme-color';
import { readThemeTokens } from '@/test/theme-tokens';

describe('Static offline.html shell', () => {
  const filePath = path.join(process.cwd(), 'public/offline.html');

  it('Scenario: Offline fallback file exists for SW', () => {
    expect(OFFLINE_FALLBACK_PATH).toBe('/offline.html');
    expect(existsSync(filePath)).toBe(true);
  });

  it('Scenario: Offline shell embeds vi/en/ja copy matching catalogs', () => {
    const html = readFileSync(filePath, 'utf-8');
    expect(html).toMatch(/app-locale/);
    // offline.html duplicates pwa.json copy (must run without network/JS bundle),
    // so every key must be checked to catch translation drift, not just the title.
    const keys = [
      'offlineTitle',
      'offlineBody',
      'offlinePrerequisite',
      'reload',
      'studyNeedsNetwork',
      'installIosHint',
    ] as const;
    for (const locale of ['en', 'vi', 'ja'] as const) {
      const pwa = loadCatalog(locale).pwa as Record<string, string>;
      for (const key of keys) {
        expect(html, `${locale}.${key} out of sync with public/offline.html`).toContain(pwa[key]);
      }
    }
  });

  it('Scenario: Offline shell palettes match the theme tokens', () => {
    const html = readFileSync(filePath, 'utf-8');
    const names = ['background', 'foreground', 'muted-foreground', 'primary', 'primary-foreground'];

    for (const themeId of THEME_IDS) {
      const tokens = readThemeTokens(themeId);
      const expected = names.map((name) => hslTokenToHex(tokens[name] ?? ''));
      const key = themeId.includes('-') ? `'${themeId}'` : themeId;
      const line = html.match(new RegExp(`\\s${key}: \\[([^\\]]+)\\]`));
      expect(line, `palette for ${themeId} missing in public/offline.html`).not.toBeNull();
      const actual = line![1].split(',').map((hex) => hex.trim().replace(/'/g, ''));
      expect(actual, `${themeId} palette out of sync with its CSS tokens`).toEqual(expected);
    }
  });
});
