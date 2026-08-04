import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@/lib/i18n/catalog';

describe('PWA i18n catalog', () => {
  it('Scenario: Locale catalog parity (pwa keys)', () => {
    const keys = [
      'offlineTitle',
      'offlineBody',
      'offlinePrerequisite',
      'reload',
      'updateAvailable',
      'updateReload',
      'updateReloadWarning',
      'studyNeedsNetwork',
      'installIosHint',
    ] as const;

    for (const locale of ['en', 'vi', 'ja'] as const) {
      const catalog = loadCatalog(locale);
      const pwa = catalog.pwa as Record<string, string> | undefined;
      expect(pwa, `locale ${locale} missing pwa`).toBeDefined();
      for (const key of keys) {
        expect(typeof pwa?.[key], `${locale}.pwa.${key}`).toBe('string');
        expect(pwa?.[key]?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it('Scenario: Offline body mentions connectivity for study', () => {
    const en = (loadCatalog('en').pwa as Record<string, string>).studyNeedsNetwork;
    expect(en.toLowerCase()).toMatch(/network|connect/);
  });
});
