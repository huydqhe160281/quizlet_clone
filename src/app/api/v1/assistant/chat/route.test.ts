import { describe, expect, it, vi, beforeEach } from 'vitest';

const authMock = vi.hoisted(() => vi.fn());
const streamAssistantChatMock = vi.hoisted(() =>
  vi.fn(() => ({
    toTextStreamResponse: vi.fn(() => new Response('ok', { status: 200 })),
  }))
);
const rateLimitMock = vi.hoisted(() => ({ check: vi.fn(() => false) }));

vi.mock('@/server/auth', () => ({ auth: authMock }));
vi.mock('@/server/services/assistant.service', () => ({
  streamAssistantChat: streamAssistantChatMock,
  toCoreMessages: (messages: Array<{ role: string; content: string }>) => messages,
}));
vi.mock('@/server/services/user-context.service', () => ({
  getGuideUserContext: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  assistantGuestRateLimit: rateLimitMock,
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { POST } from '@/app/api/v1/assistant/chat/route';

describe('assistant chat route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(null);
    rateLimitMock.check.mockReturnValue(false);
    streamAssistantChatMock.mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response('ok', { status: 200 })),
    });
  });

  it('returns stream response for guest', async () => {
    const req = new Request('http://localhost/api/v1/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hướng dẫn tạo set' }],
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(streamAssistantChatMock).toHaveBeenCalled();
  });

  it('returns 400 for empty messages', async () => {
    const req = new Request('http://localhost/api/v1/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('VALIDATION_ERROR');
  });

  it('returns 429 when guest rate limited', async () => {
    rateLimitMock.check.mockReturnValue(true);
    const req = new Request('http://localhost/api/v1/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hello' }],
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(429);
  });

  it('returns 503 when streamAssistantChat throws', async () => {
    streamAssistantChatMock.mockImplementation(() => {
      throw new Error('Ollama unavailable');
    });
    const req = new Request('http://localhost/api/v1/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hello' }],
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('ASSISTANT_UNAVAILABLE');
  });

  it('returns 400 MESSAGE_TOO_LONG for oversized message', async () => {
    const req = new Request('http://localhost/api/v1/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'x'.repeat(501) }],
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('MESSAGE_TOO_LONG');
  });

  it('accepts multi-turn history with long assistant replies', async () => {
    const req = new Request('http://localhost/api/v1/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'nói rõ hơn về chức năng tìm kiếm' },
          { role: 'assistant', content: 'a'.repeat(600) },
          { role: 'user', content: 'thư viện là gì' },
        ],
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
  });

  it('forwards abort signal to streamAssistantChat', async () => {
    const controller = new AbortController();
    const req = new Request('http://localhost/api/v1/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hello' }],
      }),
      signal: controller.signal,
    });

    await POST(req, { params: Promise.resolve({}) });
    expect(streamAssistantChatMock).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });
});
