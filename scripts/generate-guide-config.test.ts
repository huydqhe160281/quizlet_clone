import { describe, expect, it } from 'vitest';
import { buildGuideConfig } from './generate-guide-config.mjs';

describe('generate-guide-config', () => {
  it('builds config with menus and guideTargets', () => {
    const config = buildGuideConfig();
    expect(config.version).toBe(1);
    expect(config.menus.length).toBeGreaterThan(0);
    expect(config.guideTargets.length).toBe(4);
    expect(config.routes.some((route) => route.path === '/dashboard')).toBe(true);
  });

  it('Scenario: Build script no longer freezes guide copy to Vietnamese', () => {
    const config = buildGuideConfig();
    expect(config.site.locale).toBe('runtime');
    expect(config.site.locale).not.toBe('vi');
    expect(config.menus.every((m) => m.label.startsWith('nav.'))).toBe(true);
  });
});
