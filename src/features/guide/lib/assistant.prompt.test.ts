import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, isOutOfScopeTopic } from '@/features/guide/lib/assistant.prompt';
import type { GuideConfig } from '@/features/guide/schemas/guide-config.schema';

const baseConfig: GuideConfig = {
  version: 1,
  generatedAt: '2026-06-26T00:00:00.000Z',
  site: { name: 'Flashcards', locale: 'vi' },
  menus: [],
  routes: [{ path: '/sets/new', title: 'Tạo bộ thẻ', auth: 'required' }],
  flows: [],
  faq: [],
  guideTargets: [],
};

describe('assistant.prompt', () => {
  it('includes guide config in system prompt', () => {
    const prompt = buildSystemPrompt(baseConfig);
    expect(prompt).toContain('/sets/new');
    expect(prompt).toContain('tiếng Việt');
  });

  it('includes allow-listed userContext fields', () => {
    const prompt = buildSystemPrompt(baseConfig, {
      userContext: { setCount: 0, hasSets: false, recentSetIds: [] },
    });
    expect(prompt).toContain('"setCount":0');
  });

  it('detects off-topic weather questions', () => {
    expect(isOutOfScopeTopic('Thời tiết Hà Nội hôm nay?')).toBe(true);
  });
});
