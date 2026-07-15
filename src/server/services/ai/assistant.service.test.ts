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
  getOllamaChatModel: vi.fn(() => 'mock-ollama-model'),
}));

vi.mock('@/server/ai/zai', () => ({
  getZaiChatModel: vi.fn(() => 'mock-zai-model'),
}));

import { streamAssistantChat } from '@/server/services/ai/assistant.service';

// Helper: build a mock stream result where `usage` resolves successfully
function makeMockStream() {
  return {
    usage: Promise.resolve({ totalTokens: 10 }),
    toTextStreamResponse: vi.fn(),
  };
}

describe('assistant.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamTextMock.mockReturnValue(makeMockStream());
  });

  it('calls streamText with temperature 0', async () => {
    await streamAssistantChat({
      messages: [{ role: 'user', content: 'Làm sao tạo bộ thẻ?' }],
    });

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0, system: expect.stringContaining('/sets/new') })
    );
  });

  it('forwards abortSignal to streamText', async () => {
    const controller = new AbortController();
    await streamAssistantChat({
      messages: [{ role: 'user', content: 'hello' }],
      signal: controller.signal,
    });

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ abortSignal: controller.signal })
    );
  });

  it('falls back to Z.ai when Ollama fails', async () => {
    // First call (ollama) throws, second call (zai) succeeds
    streamTextMock
      .mockReturnValueOnce({
        usage: Promise.reject(new Error('Not Found')),
        toTextStreamResponse: vi.fn(),
      })
      .mockReturnValueOnce(makeMockStream());

    const result = await streamAssistantChat({
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(streamTextMock).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
  });

  it('throws when all providers fail', async () => {
    streamTextMock.mockReturnValue({
      usage: Promise.reject(new Error('All failed')),
      toTextStreamResponse: vi.fn(),
    });

    await expect(
      streamAssistantChat({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow('All failed');
  });
});
