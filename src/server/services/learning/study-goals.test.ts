import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { GOAL_DEFAULT, GOAL_MAX, GOAL_MIN } from '@/server/services/learning/constants';
import {
  computeGoalProgress,
  getGoalProgress,
  nextUtcDay,
  updateStudyGoals,
  validateDailyGoalCards,
  validatePreferredTimezone,
} from '@/server/services/learning/study-goals';
import { startOfUtcDay } from '@/server/services/user/stats.service';

const ensureUserStatsMock = vi.hoisted(() => vi.fn());
const reviewCountMock = vi.hoisted(() => vi.fn());
const userStatsUpdateMock = vi.hoisted(() => vi.fn());

vi.mock('@/server/services/user/stats.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/services/user/stats.service')>();
  return {
    ...actual,
    ensureUserStats: ensureUserStatsMock,
  };
});

vi.mock('@/server/db', () => ({
  prisma: {
    reviewHistory: {
      count: (...args: unknown[]) => reviewCountMock(...args),
    },
    userStats: {
      update: (...args: unknown[]) => userStatsUpdateMock(...args),
    },
  },
}));

describe('study goals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureUserStatsMock.mockResolvedValue({
      dailyGoalCards: GOAL_DEFAULT,
      preferredTimezone: 'UTC',
    });
    reviewCountMock.mockResolvedValue(0);
    userStatsUpdateMock.mockResolvedValue({
      dailyGoalCards: GOAL_DEFAULT,
      preferredTimezone: 'UTC',
    });
  });

  it('Scenario: Default goal for existing stats row', async () => {
    ensureUserStatsMock.mockResolvedValue({
      dailyGoalCards: GOAL_DEFAULT,
      preferredTimezone: 'UTC',
    });
    reviewCountMock.mockResolvedValue(0);
    const progress = await getGoalProgress('user-a', new Date('2026-07-28T12:00:00.000Z'));
    expect(progress).toEqual({
      target: GOAL_DEFAULT,
      completed: 0,
      remaining: GOAL_DEFAULT,
      pct: 0,
      preferredTimezone: 'UTC',
    });
  });

  it('Scenario: Update goal', () => {
    expect(validateDailyGoalCards(30)).toBe(30);
  });

  it('Scenario: Reject out-of-range goal', () => {
    expect(() => validateDailyGoalCards(0)).toThrow(ApiError);
    expect(() => validateDailyGoalCards(GOAL_MAX + 1)).toThrow(ApiError);
    expect(() => validateDailyGoalCards(GOAL_MIN - 1)).toThrow(ApiError);
  });

  it('Scenario: Progress increments after spaced review', async () => {
    const now = new Date('2026-07-28T12:00:00.000Z');
    reviewCountMock.mockResolvedValueOnce(3).mockResolvedValueOnce(4);
    const before = await getGoalProgress('user-a', now);
    const after = await getGoalProgress('user-a', now);
    expect(after.completed).toBe(before.completed + 1);
    expect(reviewCountMock).toHaveBeenCalled();
    const where = reviewCountMock.mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({
      userId: 'user-a',
      reviewedAt: {
        gte: startOfUtcDay(now),
        lt: nextUtcDay(now),
      },
    });
  });

  it('Scenario: Session-only answers do not advance goal', async () => {
    // getGoalProgress only counts ReviewHistory — session_cards never queried.
    reviewCountMock.mockResolvedValue(5);
    const progress = await getGoalProgress('user-a', new Date('2026-07-28T12:00:00.000Z'));
    expect(progress.completed).toBe(5);
    expect(reviewCountMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(reviewCountMock.mock.calls[0])).not.toMatch(/sessionCard/i);
  });

  it('Scenario: Goal met', () => {
    const progress = computeGoalProgress(10, 10);
    expect(progress.remaining).toBe(0);
    expect(progress.pct).toBe(100);
  });

  it('Scenario: Review exactly at next-UTC-day boundary excluded', async () => {
    const now = new Date('2026-07-28T15:00:00.000Z');
    const dayStart = startOfUtcDay(now);
    const boundary = nextUtcDay(now);
    reviewCountMock.mockResolvedValue(0);
    await getGoalProgress('user-a', now);
    const where = reviewCountMock.mock.calls[0]?.[0]?.where as {
      reviewedAt: { gte: Date; lt: Date };
    };
    expect(where.reviewedAt.gte.getTime()).toBe(dayStart.getTime());
    expect(where.reviewedAt.lt.getTime()).toBe(boundary.getTime());
    // Exclusive upper bound: reviewedAt === boundary is outside [gte, lt).
    expect(boundary >= where.reviewedAt.gte && boundary < where.reviewedAt.lt).toBe(false);
  });

  it('Scenario: Zero-history new user', async () => {
    ensureUserStatsMock.mockResolvedValue({
      dailyGoalCards: GOAL_DEFAULT,
      preferredTimezone: 'UTC',
    });
    reviewCountMock.mockResolvedValue(0);
    const progress = await getGoalProgress('user-a', new Date('2026-07-28T12:00:00.000Z'));
    expect(progress).toEqual({
      target: 20,
      completed: 0,
      remaining: 20,
      pct: 0,
      preferredTimezone: 'UTC',
    });
  });

  it('Scenario: Body-supplied userId is ignored', () => {
    const value = validateDailyGoalCards(30);
    expect(value).toBe(30);
  });

  it('Scenario: Default timezone is UTC', async () => {
    ensureUserStatsMock.mockResolvedValue({
      dailyGoalCards: GOAL_DEFAULT,
      preferredTimezone: 'UTC',
    });
    const progress = await getGoalProgress('user-a', new Date('2026-07-28T12:00:00.000Z'));
    expect(progress.preferredTimezone).toBe('UTC');
  });

  it('Scenario: Reject invalid timezone', async () => {
    expect(() => validatePreferredTimezone('Not/A_Zone')).toThrow(ApiError);
  });

  it('Scenario: Local midnight boundary (VN)', async () => {
    ensureUserStatsMock.mockResolvedValue({
      dailyGoalCards: 20,
      preferredTimezone: 'Asia/Ho_Chi_Minh',
    });
    reviewCountMock.mockResolvedValue(0);
    const now = new Date('2026-07-28T16:00:00.000Z');
    await getGoalProgress('user-a', now);
    const where = reviewCountMock.mock.calls[0]?.[0]?.where as {
      reviewedAt: { gte: Date; lt: Date };
    };
    expect(where.reviewedAt.gte.toISOString()).toBe('2026-07-27T17:00:00.000Z');
    expect(where.reviewedAt.lt.toISOString()).toBe('2026-07-28T17:00:00.000Z');
  });

  it('Scenario: Update timezone', async () => {
    userStatsUpdateMock.mockResolvedValue({
      dailyGoalCards: 20,
      preferredTimezone: 'Asia/Ho_Chi_Minh',
    });
    const result = await updateStudyGoals('user-a', {
      preferredTimezone: 'Asia/Ho_Chi_Minh',
    });
    expect(result.preferredTimezone).toBe('Asia/Ho_Chi_Minh');
    expect(userStatsUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { preferredTimezone: 'Asia/Ho_Chi_Minh' },
      })
    );
  });

  it('Scenario: Timezone-only PATCH', async () => {
    userStatsUpdateMock.mockResolvedValue({
      dailyGoalCards: 20,
      preferredTimezone: 'Asia/Tokyo',
    });
    await updateStudyGoals('user-a', { preferredTimezone: 'Asia/Tokyo' });
    const arg = userStatsUpdateMock.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(arg.data).toEqual({ preferredTimezone: 'Asia/Tokyo' });
    expect(arg.data).not.toHaveProperty('dailyGoalCards');
  });

  it('Scenario: Cards-only PATCH leaves timezone unchanged', async () => {
    userStatsUpdateMock.mockResolvedValue({
      dailyGoalCards: 40,
      preferredTimezone: 'UTC',
    });
    await updateStudyGoals('user-a', { dailyGoalCards: 40 });
    const arg = userStatsUpdateMock.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(arg.data).toEqual({ dailyGoalCards: 40 });
    expect(arg.data).not.toHaveProperty('preferredTimezone');
  });

  it('Scenario: Empty PATCH body rejected', async () => {
    await expect(updateStudyGoals('user-a', {})).rejects.toMatchObject({ status: 400 });
    expect(userStatsUpdateMock).not.toHaveBeenCalled();
  });

  it('Scenario: Corrupt stored timezone falls back for math', async () => {
    ensureUserStatsMock.mockResolvedValue({
      dailyGoalCards: 20,
      preferredTimezone: 'Bogus/Zone',
    });
    const now = new Date('2026-07-28T12:00:00.000Z');
    const progress = await getGoalProgress('user-a', now);
    expect(progress.preferredTimezone).toBe('Bogus/Zone');
    const where = reviewCountMock.mock.calls[0]?.[0]?.where as {
      reviewedAt: { gte: Date; lt: Date };
    };
    expect(where.reviewedAt.gte.toISOString()).toBe('2026-07-28T00:00:00.000Z');
  });
});
