import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';
import { buildUpdateToastCopy, shouldAutoReloadOnWaiting } from '@/features/pwa/update-prompt';
import { shouldRegisterServiceWorker } from '@/features/pwa/sw-policy';

describe('PWA update prompt', () => {
  it('Scenario: Update prompt when waiting', () => {
    const catalog = loadCatalog('en');
    const copy = buildUpdateToastCopy((key) => t(catalog, key));
    expect(copy.title.toLowerCase()).toMatch(/new version|update/);
    expect(copy.actionLabel.toLowerCase()).toMatch(/reload/);
  });

  it('Scenario: No silent mid-study reload', () => {
    expect(shouldAutoReloadOnWaiting()).toBe(false);
  });

  it('Scenario: Update confirm warns active study', () => {
    const catalog = loadCatalog('en');
    const copy = buildUpdateToastCopy((key) => t(catalog, key));
    expect(copy.warning.toLowerCase()).toMatch(/study|answer|lose|lost/);
  });

  it('Scenario: Dev does not register by default', () => {
    expect(
      shouldRegisterServiceWorker({
        nodeEnv: 'development',
        isSecureContext: true,
      })
    ).toBe(false);
    expect(
      shouldRegisterServiceWorker({
        nodeEnv: 'development',
        pwaDevFlag: '1',
        isSecureContext: true,
      })
    ).toBe(true);
  });

  it('Scenario: Insecure context skips registration', () => {
    expect(
      shouldRegisterServiceWorker({
        nodeEnv: 'production',
        isSecureContext: false,
      })
    ).toBe(false);
  });
});
