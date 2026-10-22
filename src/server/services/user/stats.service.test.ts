import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
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
  ensureUserStats,
  getActivity,
  getDashboardStats,
  getRecentSessions,
  getStats,
  getStreakSnapshot,
  recordDailyStudyActivity,
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
    expect(prismaMock.cardProgress.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-a',
        dueDate: { lte: expect.any(Date) },
        card: { set: { userId: 'user-a' } },
      },
    });
  });

  it('test_activity_heatmap_performance: aggregates review history in one query', async () => {
    // Pin "now": the fixture dates must stay inside the 365-day window whatever the real
    // date is (with the real clock this test started failing on 2027-01-01).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-17T12:00:00.000Z'));
    try {
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { day: '2026-01-01', count: BigInt(3) },
        { day: '2026-01-02', count: BigInt(1) },
      ]);

      const activity = await getActivity('user-a', 365);

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      expect(activity.length).toBe(365);
      expect(activity.every((day) => typeof day.count === 'number')).toBe(true);
      expect(activity[0]?.date < activity[activity.length - 1]?.date).toBe(true);
      expect(activity.some((day) => day.count === 0)).toBe(true);
      expect(activity.find((day) => day.date === '2026-01-01')?.count).toBe(3);
    } finally {
      vi.useRealTimers();
    }
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

describe('user stats rows and streak writes', () => {
  const now = new Date('2026-06-17T12:00:00.000Z');
  const uniqueViolation = () =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ensureUserStats returns the existing row without creating one', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue({ userId: 'u' });
    await expect(ensureUserStats('u')).resolves.toEqual({ userId: 'u' });
    expect(prismaMock.userStats.create).not.toHaveBeenCalled();
  });

  it('ensureUserStats re-reads the row when a concurrent create wins the race', async () => {
    prismaMock.userStats.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ userId: 'u', currentStreak: 0 });
    prismaMock.userStats.create.mockRejectedValue(uniqueViolation());

    await expect(ensureUserStats('u')).resolves.toMatchObject({ userId: 'u' });
    expect(prismaMock.userStats.findUnique).toHaveBeenCalledTimes(2);
  });

  it('ensureUserStats rethrows when the row is still missing or the error is unrelated', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue(null);
    prismaMock.userStats.create.mockRejectedValueOnce(uniqueViolation());
    await expect(ensureUserStats('u')).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);

    prismaMock.userStats.create.mockRejectedValueOnce(new Error('boom'));
    await expect(ensureUserStats('u')).rejects.toThrow('boom');
  });

  it('recordDailyStudyActivity is a no-op on a day already counted', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue({
      userId: 'u',
      currentStreak: 4,
      longestStreak: 4,
      lastStudiedDate: new Date('2026-06-17T00:00:00.000Z'),
    });

    const result = await recordDailyStudyActivity('u', now);

    expect(result.changed).toBe(false);
    expect(prismaMock.userStats.update).not.toHaveBeenCalled();
  });

  it('recordDailyStudyActivity starts a streak at 1 for a first study day', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue({
      userId: 'u',
      currentStreak: 0,
      longestStreak: 2,
      lastStudiedDate: null,
    });
    prismaMock.userStats.update.mockResolvedValue({ currentStreak: 1 });

    const result = await recordDailyStudyActivity('u', now);

    expect(result.changed).toBe(true);
    expect(prismaMock.userStats.update).toHaveBeenCalledWith({
      where: { userId: 'u' },
      data: {
        currentStreak: 1,
        longestStreak: 2,
        lastStudiedDate: new Date('2026-06-17T00:00:00.000Z'),
      },
    });
  });

  it('getStreakSnapshot persists a lapsed streak as 0', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue({
      userId: 'u',
      currentStreak: 5,
      longestStreak: 9,
      lastStudiedDate: new Date('2026-06-10T00:00:00.000Z'),
    });

    const snapshot = await getStreakSnapshot('u');

    expect(snapshot).toEqual({
      currentStreak: 0,
      longestStreak: 9,
      lastStudiedDate: '2026-06-10T00:00:00.000Z',
    });
    expect(prismaMock.userStats.update).toHaveBeenCalledWith({
      where: { userId: 'u' },
      data: { currentStreak: 0 },
    });
  });

  it('getStreakSnapshot leaves an active streak untouched', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue({
      userId: 'u',
      currentStreak: 2,
      longestStreak: 2,
      lastStudiedDate: new Date('2026-06-16T00:00:00.000Z'),
    });

    const snapshot = await getStreakSnapshot('u');

    expect(snapshot.currentStreak).toBe(2);
    expect(prismaMock.userStats.update).not.toHaveBeenCalled();
  });

  it('recordReviewStats does not bump totalCorrect for a wrong answer', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue({
      userId: 'u',
      currentStreak: 1,
      longestStreak: 1,
      lastStudiedDate: now,
    });
    prismaMock.userStats.update.mockResolvedValue({});

    await recordReviewStats('u', false);

    expect(prismaMock.userStats.update).toHaveBeenCalledTimes(1);
  });

  it('getStats reports zero accuracy before any review', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue({
      userId: 'u',
      currentStreak: 0,
      longestStreak: 0,
      lastStudiedDate: null,
      totalReviews: 0,
      totalCorrect: 0,
    });
    prismaMock.flashcardSet.count.mockResolvedValue(0);
    prismaMock.flashcard.count.mockResolvedValue(0);
    prismaMock.cardProgress.count.mockResolvedValue(0);

    await expect(getStats('u')).resolves.toMatchObject({ accuracy: 0, currentStreak: 0 });
  });

  it('getRecentSessions prefers completed, then further along, then newer sessions', async () => {
    const base = { setId: 'set-1', mode: 'LEARN', totalCards: 10, correctCount: 0, score: null };
    const set = { id: 'set-1', title: 'A' };
    prismaMock.studySession.findMany.mockResolvedValue([
      {
        ...base,
        id: 'less-progress',
        completedAt: null,
        startedAt: new Date('2026-06-16T10:00:00.000Z'),
        set,
        _count: { sessionCards: 2 },
      },
      {
        ...base,
        id: 'more-progress',
        completedAt: null,
        startedAt: new Date('2026-06-15T10:00:00.000Z'),
        set,
        _count: { sessionCards: 6 },
      },
      {
        ...base,
        id: 'tie-older',
        mode: 'WRITE',
        completedAt: null,
        startedAt: new Date('2026-06-14T09:00:00.000Z'),
        set,
        _count: { sessionCards: 3 },
      },
      {
        ...base,
        id: 'tie-newer',
        mode: 'WRITE',
        completedAt: null,
        startedAt: new Date('2026-06-16T09:00:00.000Z'),
        set,
        _count: { sessionCards: 3 },
      },
      {
        ...base,
        id: 'open-test',
        mode: 'TEST',
        completedAt: null,
        startedAt: new Date('2026-06-16T11:00:00.000Z'),
        set,
        _count: { sessionCards: 9 },
      },
      {
        ...base,
        id: 'empty-set',
        mode: 'TEST',
        totalCards: 0,
        completedAt: new Date('2026-06-13T09:30:00.000Z'),
        startedAt: new Date('2026-06-13T09:00:00.000Z'),
        set,
        _count: { sessionCards: 0 },
      },
    ]);

    const sessions = await getRecentSessions('u', 10);
    const ids = sessions.map((session) => session.id).sort();

    expect(ids).toEqual(['empty-set', 'more-progress', 'tie-newer']);
    expect(sessions.find((session) => session.id === 'empty-set')?.progress).toBe(0);
  });
});
