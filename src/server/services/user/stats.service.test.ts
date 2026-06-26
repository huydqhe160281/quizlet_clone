import { describe, expect, it, vi, beforeEach } from 'vitest';
import { calculateStreakAfterReview } from '@/server/services/user/stats.service';

const prismaMock = vi.hoisted(() => ({
  userStats: {
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  flashcardSet: { count: vi.fn() },
  flashcard: { count: vi.fn() },
  cardProgress: { count: vi.fn() },
  reviewHistory: { findMany: vi.fn() },
  studySession: { findMany: vi.fn() },
}));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));

import {
  getActivity,
  getDashboardStats,
  getRecentSessions,
  getStats,
  recordReviewStats,
  updateStreak,
} from '@/server/services/user/stats.service';

describe('stats streak calculation', () => {
  const today = new Date('2026-06-17T12:00:00.000Z');
  const yesterday = new Date('2026-06-16T12:00:00.000Z');

  it('test_streak_maintained: consecutive days increment streak', () => {
    const result = calculateStreakAfterReview(2, 5, yesterday, today);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(5);
  });

  it('test_streak_broken: gap resets streak to 1', () => {
    const lastWeek = new Date('2026-06-10T12:00:00.000Z');
    const result = calculateStreakAfterReview(4, 4, lastWeek, today);
    expect(result.currentStreak).toBe(1);
  });

  it('test_streak_calculation: same day keeps streak unchanged', () => {
    const result = calculateStreakAfterReview(3, 7, today, today);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(7);
  });
});

describe('dashboard stats service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.userStats.findUnique.mockResolvedValue(null);
    prismaMock.userStats.create.mockResolvedValue({
      currentStreak: 2,
      longestStreak: 5,
      totalReviews: 10,
      totalCorrect: 8,
    });
    prismaMock.userStats.upsert.mockResolvedValue({
      currentStreak: 2,
      longestStreak: 5,
      totalReviews: 10,
      totalCorrect: 8,
    });
    prismaMock.flashcardSet.count.mockResolvedValue(3);
    prismaMock.flashcard.count.mockResolvedValue(24);
    prismaMock.cardProgress.count.mockResolvedValue(4);
  });

  it('test_dashboard_stats_response: returns accuracy and counts', async () => {
    const stats = await getStats('user-a');

    expect(stats.totalSets).toBe(3);
    expect(stats.totalCards).toBe(24);
    expect(stats.dueToday).toBe(4);
    expect(stats.accuracy).toBe(0.8);
  });

  it('test_activity_heatmap_performance: aggregates review history quickly', async () => {
    const reviews = Array.from({ length: 500 }, (_, index) => ({
      reviewedAt: new Date(Date.UTC(2026, 0, 1 + (index % 365))),
    }));
    prismaMock.reviewHistory.findMany.mockResolvedValue(reviews);

    const started = performance.now();
    const activity = await getActivity('user-a', 365);
    const elapsed = performance.now() - started;

    expect(activity.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(200);
  });

  it('test_update_streak: increments streak on consecutive day', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue({
      userId: 'user-a',
      currentStreak: 2,
      longestStreak: 5,
      lastStudiedDate: new Date('2026-06-16T12:00:00.000Z'),
    });
    prismaMock.userStats.update.mockResolvedValue({
      currentStreak: 3,
      longestStreak: 5,
    });

    const result = await updateStreak('user-a', new Date('2026-06-17T12:00:00.000Z'));
    expect(result.currentStreak).toBe(3);
  });

  it('test_record_review_stats: increments correct count when answer is correct', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue({
      userId: 'user-a',
      currentStreak: 1,
      longestStreak: 1,
      lastStudiedDate: new Date('2026-06-17T12:00:00.000Z'),
    });
    prismaMock.userStats.update.mockResolvedValue({});

    await recordReviewStats('user-a', true);

    expect(prismaMock.userStats.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { totalCorrect: { increment: 1 } },
      })
    );
  });

  it('test_get_recent_sessions: returns completed sessions', async () => {
    prismaMock.studySession.findMany.mockResolvedValue([
      { id: 's1', set: { id: 'set-1', title: 'Vocab' } },
    ]);

    const sessions = await getRecentSessions('user-a', 3);
    expect(sessions).toHaveLength(1);
  });

  it('test_get_dashboard_stats_unauthorized: rejects missing user id', async () => {
    await expect(getDashboardStats('')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });
});
