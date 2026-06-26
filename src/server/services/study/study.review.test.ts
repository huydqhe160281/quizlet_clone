import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  flashcard: { findUnique: vi.fn() },
  cardProgress: { findUnique: vi.fn(), upsert: vi.fn() },
  reviewHistory: { create: vi.fn() },
}));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));

vi.mock('@/server/services/user/stats.service', () => ({
  recordReviewStats: vi.fn(),
}));

import { reviewCard } from '@/server/services/study/study.service';

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
  });

  it('test_review_submission_creates_history: stores progress and review history', async () => {
    const result = await reviewCard('user-a', 'card-1', 'GOOD', 1200);

    expect(prismaMock.reviewHistory.create).toHaveBeenCalledWith({
      data: { userId: 'user-a', cardId: 'card-1', grade: 'GOOD', responseMs: 1200 },
    });
    expect(result.cardId).toBe('card-1');
    expect(result.newInterval).toBe(1);
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
