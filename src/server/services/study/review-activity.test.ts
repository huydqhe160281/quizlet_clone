import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  reviewHistory: { count: vi.fn() },
  sessionCard: { count: vi.fn() },
  reviewActivityArchive: { aggregate: vi.fn() },
}));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));

import { countReviewActivity } from '@/server/services/study/review-activity';

describe('countReviewActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.reviewHistory.count.mockResolvedValue(10);
    prismaMock.sessionCard.count.mockResolvedValue(5);
  });

  it('adds reviews archived from deleted sets to the live counts', async () => {
    prismaMock.reviewActivityArchive.aggregate.mockResolvedValue({ _sum: { count: 100 } });

    await expect(countReviewActivity('user-a')).resolves.toBe(115);
    expect(prismaMock.reviewActivityArchive.aggregate).toHaveBeenCalledWith({
      where: { userId: 'user-a' },
      _sum: { count: true },
    });
  });

  it('treats an empty archive as zero', async () => {
    prismaMock.reviewActivityArchive.aggregate.mockResolvedValue({ _sum: { count: null } });

    await expect(countReviewActivity('user-a')).resolves.toBe(15);
  });
});
