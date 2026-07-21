import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  calculateStreakAfterReview,
  getEffectiveStreak,
} from '@/server/services/user/stats.service';

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
  sessionCard: { findMany: vi.fn() },
  studySession: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
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

  it('getEffectiveStreak: returns 0 when gap is 2+ days', () => {
    const lastStudied = new Date('2026-06-14T12:00:00.000Z');
    const now = new Date('2026-06-17T12:00:00.000Z');
    expect(getEffectiveStreak(5, lastStudied, now)).toBe(0);
  });

  it('getEffectiveStreak: keeps streak on yesterday study', () => {
    expect(getEffectiveStreak(3, yesterday, today)).toBe(3);
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
    prismaMock.$queryRaw.mockResolvedValueOnce([
      { day: '2026-01-01', count: BigInt(3) },
      { day: '2026-01-02', count: BigInt(1) },
    ]);

    const started = performance.now();
    const activity = await getActivity('user-a', 365);
    const elapsed = performance.now() - started;

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(activity.length).toBe(365);
    expect(activity.every((day) => typeof day.count === 'number')).toBe(true);
    expect(activity[0]?.date < activity[activity.length - 1]?.date).toBe(true);
    expect(activity.some((day) => day.count === 0)).toBe(true);
    expect(activity.some((day) => day.count === 3)).toBe(true);
    expect(elapsed).toBeLessThan(200);
  });

  it('getActivity: sums union sources in one query result', async () => {
    const todayKey = new Date().toISOString().slice(0, 10);
    prismaMock.$queryRaw.mockResolvedValueOnce([{ day: todayKey, count: BigInt(5) }]);

    const activity = await getActivity('user-a', 7);
    const hit = activity.find((day) => day.date === todayKey);

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(activity).toHaveLength(7);
    expect(hit?.count).toBe(5);
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
      {
        id: 's1',
        setId: 'set-1',
        mode: 'LEARN',
        totalCards: 10,
        correctCount: 7,
        score: null,
        startedAt: new Date('2026-06-17T12:00:00.000Z'),
        completedAt: null,
        set: { id: 'set-1', title: 'Vocab' },
        _count: { sessionCards: 7 },
      },
    ]);

    const sessions = await getRecentSessions('user-a', 3);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.answeredCount).toBe(7);
    expect(sessions[0]?.progress).toBe(0.7);
    expect(sessions[0]?.accuracy).toBeNull();
    expect(prismaMock.studySession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-a',
        }),
        orderBy: { startedAt: 'desc' },
        take: 24,
      })
    );
  });

  it('test_get_recent_sessions: groups by set and mode', async () => {
    prismaMock.studySession.findMany.mockResolvedValue([
      {
        id: 's-new',
        setId: 'set-1',
        mode: 'LEARN',
        totalCards: 10,
        correctCount: 0,
        score: null,
        startedAt: new Date('2026-06-18T12:00:00.000Z'),
        completedAt: null,
        set: { id: 'set-1', title: 'Vocab' },
        _count: { sessionCards: 2 },
      },
      {
        id: 's-old',
        setId: 'set-1',
        mode: 'LEARN',
        totalCards: 10,
        correctCount: 0,
        score: null,
        startedAt: new Date('2026-06-17T12:00:00.000Z'),
        completedAt: null,
        set: { id: 'set-1', title: 'Vocab' },
        _count: { sessionCards: 7 },
      },
      {
        id: 's-other',
        setId: 'set-2',
        mode: 'LEARN',
        totalCards: 5,
        correctCount: 4,
        score: 0.8,
        startedAt: new Date('2026-06-16T12:00:00.000Z'),
        completedAt: new Date('2026-06-16T12:30:00.000Z'),
        set: { id: 'set-2', title: 'Kanji' },
        _count: { sessionCards: 5 },
      },
    ]);

    const sessions = await getRecentSessions('user-a', 5);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.id).toBe('s-old');
    expect(sessions[0]?.progress).toBe(0.7);
    expect(sessions[1]?.id).toBe('s-other');
    expect(sessions[1]?.accuracy).toBe(0.8);
  });

  it('test_get_dashboard_stats_unauthorized: rejects missing user id', async () => {
    await expect(getDashboardStats('')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });
});
