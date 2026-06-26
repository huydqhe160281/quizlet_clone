import { describe, expect, it } from 'vitest';
import { buildGuideConfig } from './generate-guide-config.mjs';

describe('generate-guide-config', () => {
  it('builds config with menus and guideTargets', () => {
    const config = buildGuideConfig();
    expect(config.version).toBe(1);
    expect(config.menus.length).toBeGreaterThan(0);
    expect(config.guideTargets.length).toBe(5);
    expect(config.routes.some((route) => route.path === '/dashboard')).toBe(true);
  });
});
