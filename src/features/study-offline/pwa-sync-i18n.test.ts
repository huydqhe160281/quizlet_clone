import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@/lib/i18n/catalog';

describe('offline sync i18n parity', () => {
  const keys = [
    'syncPending',
    'syncFailed',
    'syncNow',
    'syncSynced',
    'syncFailedSessionComplete',
    'syncDismissFailed',
  ] as const;

  it('Scenario: New sync-status strings have vi/en/ja parity', () => {
    for (const locale of ['en', 'vi', 'ja'] as const) {
      const pwa = loadCatalog(locale).pwa as Record<string, string>;
      for (const key of keys) {
        expect(typeof pwa[key], `${locale}.pwa.${key}`).toBe('string');
        expect(pwa[key]!.length).toBeGreaterThan(0);
      }
    }
  });
});
