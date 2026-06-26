import { describe, expect, it } from 'vitest';
import {
  GuideConfigError,
  guideConfigSchema,
  parseGuideConfig,
} from '@/features/guide/schemas/guide-config.schema';

const validConfig = {
  version: 1,
  generatedAt: '2026-06-26T00:00:00.000Z',
  site: { name: 'Flashcards', locale: 'vi' },
  menus: [{ id: 'dashboard', label: 'Dashboard', href: '/dashboard' }],
  routes: [{ path: '/sets/new', title: 'Tạo bộ thẻ', auth: 'required' as const }],
  flows: [{ id: 'first-set', title: 'Tạo bộ thẻ đầu tiên', steps: ['Vào My Sets', '/sets/new'] }],
  faq: [{ q: 'Làm sao học?', a: 'Vào Study' }],
  guideTargets: [{ id: 'nav-sets', selector: '[data-guide=nav-sets]', label: 'My Sets' }],
};

describe('guide-config.schema', () => {
  it('parses a valid config', () => {
    expect(parseGuideConfig(validConfig)).toMatchObject({ version: 1 });
  });

  it('rejects config missing version', () => {
    const { version: _version, ...rest } = validConfig;
    expect(() => parseGuideConfig(rest)).toThrow(GuideConfigError);
  });

  it('validates guideTargets shape', () => {
    const result = guideConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });
});
