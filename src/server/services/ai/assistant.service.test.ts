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

vi.mock('@/config/env', () => ({
  env: { motapiChatModels: ['chat-a', 'chat-b', 'chat-c', 'chat-d'] },
}));

vi.mock('@/server/ai/motapi', () => ({
  getMotapiChatModel: vi.fn((modelId: string) => `mock:${modelId}`),
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
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
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

  it('aborts the stream when the caller signal aborts', async () => {
    const controller = new AbortController();
    await streamAssistantChat({
      messages: [{ role: 'user', content: 'hello' }],
      signal: controller.signal,
    });

    const { abortSignal } = streamTextMock.mock.calls[0]![0] as { abortSignal: AbortSignal };
    expect(abortSignal.aborted).toBe(false);
    controller.abort();
    expect(abortSignal.aborted).toBe(true);
  });

  it('switches to the next model when the first one fails', async () => {
    streamTextMock
      .mockReturnValueOnce(failingStream('Not Found'))
      .mockReturnValueOnce(makeMockStream());

    const result = await streamAssistantChat({
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(streamTextMock.mock.calls.map((call) => call[0].model)).toEqual([
      'mock:chat-a',
      'mock:chat-b',
    ]);
    expect(streamTextMock).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0 }));
    expect(result).toBeDefined();
  });

  it('treats an empty answer as a failure and switches model', async () => {
    streamTextMock
      .mockReturnValueOnce(makeMockStream([{ type: 'start' }, { type: 'finish' }]))
      .mockReturnValueOnce(makeMockStream());

    await streamAssistantChat({ messages: [{ role: 'user', content: 'hi' }] });
    expect(streamTextMock).toHaveBeenCalledTimes(2);
  });

  it('throws after 3 models fail', async () => {
    streamTextMock.mockImplementation(() => failingStream('All failed'));

    await expect(
      streamAssistantChat({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow('All failed');
    expect(streamTextMock).toHaveBeenCalledTimes(3);
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
