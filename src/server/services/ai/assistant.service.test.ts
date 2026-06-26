import { describe, expect, it, vi, beforeEach } from 'vitest';

const streamTextMock = vi.hoisted(() => vi.fn());
const loadGuideConfigMock = vi.hoisted(() =>
  vi.fn(() => ({
    version: 1,
    generatedAt: '2026-06-26T00:00:00.000Z',
    site: { name: 'Flashcards', locale: 'vi' },
    menus: [],
    routes: [{ path: '/sets/new', title: 'Tạo', auth: 'required' as const }],
    flows: [],
    faq: [],
    guideTargets: [],
  }))
);

vi.mock('ai', () => ({
  streamText: streamTextMock,
}));

vi.mock('@/features/guide/lib/load-guide-config', () => ({
  loadGuideConfig: loadGuideConfigMock,
}));

vi.mock('@/server/ai/ollama', () => ({
  getOllamaChatModel: vi.fn(() => 'mock-model'),
}));

import { streamAssistantChat } from '@/server/services/ai/assistant.service';

describe('assistant.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamTextMock.mockReturnValue({ toTextStreamResponse: vi.fn() });
  });

  it('calls streamText with temperature 0', () => {
    streamAssistantChat({
      messages: [{ role: 'user', content: 'Làm sao tạo bộ thẻ?' }],
    });

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0, system: expect.stringContaining('/sets/new') })
    );
  });

  it('forwards abortSignal to streamText', () => {
    const controller = new AbortController();
    streamAssistantChat({
      messages: [{ role: 'user', content: 'hello' }],
      signal: controller.signal,
    });

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ abortSignal: controller.signal })
    );
  });
});
