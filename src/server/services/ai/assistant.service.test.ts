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

vi.mock('@/lib/i18n/getRequestLocale', () => ({
  getRequestLocale: vi.fn(async () => 'vi'),
}));

import { streamAssistantChat } from '@/server/services/ai/assistant.service';

type Part = { type: string; text?: string; error?: unknown };

/** Mock streamText result whose fullStream yields the given parts. */
function makeMockStream(parts: Part[] = [{ type: 'text-delta', text: 'ok' }]) {
  return {
    fullStream: (async function* () {
      for (const part of parts) yield part;
    })(),
  };
}

function failingStream(message: string) {
  return makeMockStream([{ type: 'start' }, { type: 'error', error: new Error(message) }]);
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
      .mockReturnValueOnce(failingStream('Not Found'))
      .mockReturnValueOnce(makeMockStream());

    const result = await streamAssistantChat({
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(streamTextMock).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
  });

  it('throws when all providers fail', async () => {
    streamTextMock.mockImplementation(() => failingStream('All failed'));

    await expect(
      streamAssistantChat({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow('All failed');
  });

  it('streams text as it arrives instead of waiting for the whole answer', async () => {
    let releaseRest!: () => void;
    const gate = new Promise<void>((resolve) => (releaseRest = resolve));
    streamTextMock.mockReturnValue({
      fullStream: (async function* () {
        yield { type: 'start' };
        yield { type: 'text-delta', text: 'Hel' };
        await gate;
        yield { type: 'text-delta', text: 'lo' };
        yield { type: 'finish' };
      })(),
    });

    const result = await streamAssistantChat({ messages: [{ role: 'user', content: 'hi' }] });
    const reader = result.toTextStreamResponse().body!.getReader();
    const decoder = new TextDecoder();

    // The first chunk is readable while the provider is still generating.
    const first = await reader.read();
    expect(decoder.decode(first.value)).toBe('Hel');

    releaseRest();
    let rest = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      rest += decoder.decode(value);
    }
    expect(rest).toBe('lo');
  });
});
