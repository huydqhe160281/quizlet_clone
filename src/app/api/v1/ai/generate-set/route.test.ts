import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiError } from '@/lib/api-error';

const generateAiSetMock = vi.hoisted(() => vi.fn());
const requireUserIdMock = vi.hoisted(() => vi.fn());
const releaseMock = vi.hoisted(() => vi.fn(async () => {}));
const assertAiGenerateRateLimitMock = vi.hoisted(() =>
  vi.fn<
    (
      userId: string,
      opts?: { emailVerified?: boolean }
    ) => Promise<{
      release: () => Promise<void>;
    }>
  >(async () => ({ release: releaseMock }))
);

vi.mock('@/server/services/ai/ai-set.service', () => ({
  generateAiSet: generateAiSetMock,
}));

vi.mock('@/server/auth/auth-utils', () => ({
  requireUserId: requireUserIdMock,
}));

const hasVerifiedEmailMock = vi.hoisted(() => vi.fn(async () => true));
vi.mock('@/server/auth/email-verified', () => ({
  hasVerifiedEmail: hasVerifiedEmailMock,
}));

vi.mock('@/lib/rate-limit/ai-rate-limit-guard', () => ({
  assertAiGenerateRateLimit: assertAiGenerateRateLimitMock,
}));

import { maxDuration, POST } from '@/app/api/v1/ai/generate-set/route';

describe('POST /api/v1/ai/generate-set', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertAiGenerateRateLimitMock.mockResolvedValue({ release: releaseMock });
    hasVerifiedEmailMock.mockResolvedValue(true);
    requireUserIdMock.mockResolvedValue('user-a');
    generateAiSetMock.mockResolvedValue({
      id: 'set-1',
      title: 'Test Set',
      description: 'Desc',
      visibility: 'PRIVATE',
      cards: [{ id: 'c1', front: 'a', back: 'b', example: null, sortOrder: 0 }],
    });
  });

  it('Scenario: Route exports maxDuration', () => {
    expect(maxDuration).toBeGreaterThanOrEqual(120);
  });

  it('Scenario: Unauthenticated request', async () => {
    requireUserIdMock.mockRejectedValue(new ApiError('UNAUTHORIZED', 'Not authenticated', 401));

    const response = await POST(
      new Request('http://localhost/api/v1/ai/generate-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Create flashcards about cats', cardCount: 10 }),
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(401);
    expect(generateAiSetMock).not.toHaveBeenCalled();
  });

  it('Scenario: Successful generation via route', async () => {
    const response = await POST(
      new Request('http://localhost/api/v1/ai/generate-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Create flashcards about cats', cardCount: 10 }),
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      data: { set: { visibility: string }; cards: unknown[] };
    };
    expect(payload.data.set.visibility).toBe('PRIVATE');
    expect(payload.data.cards).toHaveLength(1);
  });

  it('gives the unverified allowance back when generation fails', async () => {
    hasVerifiedEmailMock.mockResolvedValue(false);
    generateAiSetMock.mockRejectedValue(new Error('LLM down'));

    const response = await POST(
      new Request('http://localhost/api/v1/ai/generate-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Create flashcards about cats', cardCount: 10 }),
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(500);
    expect(assertAiGenerateRateLimitMock).toHaveBeenCalledWith('user-a', { emailVerified: false });
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid input before touching the rate limit', async () => {
    const response = await POST(
      new Request('http://localhost/api/v1/ai/generate-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '' }),
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(400);
    expect(assertAiGenerateRateLimitMock).not.toHaveBeenCalled();
  });

  it('Scenario: Unlimited mode accepts prompt only', async () => {
    const response = await POST(
      new Request('http://localhost/api/v1/ai/generate-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Generate a full hiragana learning set' }),
      }),
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(201);
    expect(generateAiSetMock).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({ prompt: 'Generate a full hiragana learning set' })
    );
  });
});
