import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  flashcard: { findUnique: vi.fn() },
  cardProgress: { findUnique: vi.fn(), upsert: vi.fn() },
  reviewHistory: { create: vi.fn() },
  processedMutation: { create: vi.fn() },
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
}));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));

vi.mock('@/server/services/user/stats.service', () => ({
  recordReviewStats: vi.fn(),
}));

import { Prisma } from '@prisma/client';
import { isProcessedMutationConflict, reviewCard } from '@/server/services/study/study.service';
import { recordReviewStats } from '@/server/services/user/stats.service';

describe('study spaced repetition review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.flashcard.findUnique.mockResolvedValue({
      id: 'card-1',
      set: { userId: 'user-a' },
    });
    prismaMock.cardProgress.findUnique.mockResolvedValue(null);
    prismaMock.cardProgress.upsert.mockResolvedValue({
      interval: 1,
      easeFactor: 2.5,
      dueDate: new Date('2026-06-18T00:00:00.000Z'),
    });
    prismaMock.reviewHistory.create.mockResolvedValue({ id: 'history-1' });
    prismaMock.processedMutation.create.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prismaMock) => unknown)(prismaMock);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
  });

  it('test_review_submission_creates_history: stores progress and review history', async () => {
    const result = await reviewCard('user-a', 'card-1', 'GOOD', 1200);

    expect(prismaMock.reviewHistory.create).toHaveBeenCalledWith({
      data: { userId: 'user-a', cardId: 'card-1', grade: 'GOOD', responseMs: 1200 },
    });
    expect(result.cardId).toBe('card-1');
    expect(result.newInterval).toBe(1);
    expect(result.applied).toBe(true);
    expect(recordReviewStats).toHaveBeenCalledWith('user-a', true);
  });

  it('locks the progress row and computes SM-2 from the state read inside the transaction', async () => {
    prismaMock.cardProgress.findUnique.mockResolvedValue({
      repetitions: 1,
      easeFactor: 2.5,
      interval: 1,
      dueDate: new Date(),
    });

    await reviewCard('user-a', 'card-1', 'GOOD');

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = (prismaMock.$queryRaw.mock.calls[0]?.[0] as TemplateStringsArray).join('?');
    expect(sql).toContain('FOR UPDATE');
    // rep 1 → 2 gives the SM-2 6-day interval: computed from the locked read.
    expect(prismaMock.cardProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ interval: 6, repetitions: 2 }) })
    );
    expect(prismaMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prismaMock.cardProgress.findUnique.mock.invocationCallOrder[0]!
    );
  });

  it('a replayed clientMutationId returns applied:false without recording stats', async () => {
    prismaMock.processedMutation.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['clientMutationId', 'userId'] },
      })
    );

    const result = await reviewCard('user-a', 'card-1', 'GOOD', undefined, 'mutation-1');

    expect(result.applied).toBe(false);
    expect(recordReviewStats).not.toHaveBeenCalled();
  });

  it('a P2002 from card_progress is not mistaken for a replay', async () => {
    prismaMock.cardProgress.upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['userId', 'cardId'] },
      })
    );

    await expect(
      reviewCard('user-a', 'card-1', 'GOOD', undefined, 'mutation-1')
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('isProcessedMutationConflict recognises the constraint by field or index name', () => {
    const err = (target: unknown) =>
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target },
      });
    expect(
      isProcessedMutationConflict(err('processed_mutations_clientMutationId_userId_key'))
    ).toBe(true);
    expect(isProcessedMutationConflict(err(['userId', 'cardId']))).toBe(false);
    expect(isProcessedMutationConflict(new Error('x'))).toBe(false);
  });

  it('test_review_forbidden: rejects reviewing another users card', async () => {
    prismaMock.flashcard.findUnique.mockResolvedValue({
      id: 'card-1',
      set: { userId: 'user-b' },
    });

    await expect(reviewCard('user-a', 'card-1', 'GOOD')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });
});
