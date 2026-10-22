import { describe, expect, it } from 'vitest';
import { buildGuideConfig, reusePreviousTimestamp } from './generate-guide-config.mjs';

describe('generate-guide-config', () => {
  it('builds config with menus and guideTargets', () => {
    const config = buildGuideConfig();
    expect(config.version).toBe(1);
    expect(config.menus.length).toBeGreaterThan(0);
    expect(config.guideTargets.length).toBe(5);
    expect(config.guideTargets.some((t) => t.id === 'nav-today')).toBe(true);
    expect(config.menus.some((m) => m.href === '/today')).toBe(true);
    expect(config.routes.some((route) => route.path === '/dashboard')).toBe(true);
  });

  it('Scenario: Build script no longer freezes guide copy to Vietnamese', () => {
    const config = buildGuideConfig();
    expect(config.site.locale).toBe('runtime');
    expect(config.site.locale).not.toBe('vi');
    expect(config.menus.every((m) => m.label.startsWith('nav.'))).toBe(true);
  });

  it('keeps the committed generatedAt when content is unchanged (deterministic check)', () => {
    const config = buildGuideConfig();
    const previous = JSON.stringify({ ...config, generatedAt: '2026-01-01T00:00:00.000Z' });
    expect(reusePreviousTimestamp(config, previous).generatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('refreshes generatedAt when content changed', () => {
    const config = buildGuideConfig();
    const previous = JSON.stringify({
      ...config,
      version: 0,
      generatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(reusePreviousTimestamp(config, previous).generatedAt).toBe(config.generatedAt);
    expect(reusePreviousTimestamp(config, 'not json').generatedAt).toBe(config.generatedAt);
  });
});
