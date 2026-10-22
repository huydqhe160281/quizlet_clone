import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireUserIdMock = vi.hoisted(() => vi.fn());
const recordSessionAnswersBatchMock = vi.hoisted(() => vi.fn());

vi.mock('@/server/auth/auth-utils', () => ({
  requireUserId: requireUserIdMock,
}));

vi.mock('@/lib/rate-limit/rate-limit-guard', () => ({
  assertApiRateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/server/services/study/study.service', () => ({
  completeSession: vi.fn(),
  getOwnedSessionForStudy: vi.fn(),
  recordSessionAnswer: vi.fn(),
  recordSessionAnswersBatch: recordSessionAnswersBatchMock,
}));

import * as route from '@/app/api/v1/study/sessions/[sessionId]/route';

const ctx = { params: Promise.resolve({ sessionId: 'session-1' }) };

describe('study session route — beacon flush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserIdMock.mockResolvedValue('user-a');
    recordSessionAnswersBatchMock.mockResolvedValue({ recorded: 1 });
  });

  it('exports POST so navigator.sendBeacon (always POST) is not rejected with 405', () => {
    expect(typeof route.POST).toBe('function');
  });

  it('POST records the beacon answer batch for the signed-in user', async () => {
    const answer = {
      cardId: 'clx0000000000000000000001',
      isCorrect: true,
      clientMutationId: crypto.randomUUID(),
    };
    const req = new Request('http://localhost/api/v1/study/sessions/session-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: [answer] }),
    });

    const res = await route.POST(req, ctx);

    expect(res.status).toBe(200);
    expect(recordSessionAnswersBatchMock).toHaveBeenCalledWith('session-1', 'user-a', [answer]);
  });

  it('POST rejects a body without answers', async () => {
    const req = new Request('http://localhost/api/v1/study/sessions/session-1', {
      method: 'POST',
      body: JSON.stringify({ correctCount: 3 }),
    });

    const res = await route.POST(req, ctx);

    expect(res.status).toBe(400);
    expect(recordSessionAnswersBatchMock).not.toHaveBeenCalled();
  });
});
