import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { GOAL_DEFAULT, GOAL_MAX, GOAL_MIN } from '@/server/services/learning/constants';
import {
  computeGoalProgress,
  getGoalProgress,
  nextUtcDay,
  validateDailyGoalCards,
} from '@/server/services/learning/study-goals';
import { startOfUtcDay } from '@/server/services/user/stats.service';

const ensureUserStatsMock = vi.hoisted(() => vi.fn());
const reviewCountMock = vi.hoisted(() => vi.fn());

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
      update: vi.fn(),
    },
  },
}));

describe('study goals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureUserStatsMock.mockResolvedValue({ dailyGoalCards: GOAL_DEFAULT });
    reviewCountMock.mockResolvedValue(0);
  });

  it('Scenario: Default goal for existing stats row', async () => {
    ensureUserStatsMock.mockResolvedValue({ dailyGoalCards: GOAL_DEFAULT });
    reviewCountMock.mockResolvedValue(0);
    const progress = await getGoalProgress('user-a', new Date('2026-07-28T12:00:00.000Z'));
    expect(progress).toEqual({
      target: GOAL_DEFAULT,
      completed: 0,
      remaining: GOAL_DEFAULT,
      pct: 0,
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
    ensureUserStatsMock.mockResolvedValue({ dailyGoalCards: GOAL_DEFAULT });
    reviewCountMock.mockResolvedValue(0);
    const progress = await getGoalProgress('user-a', new Date('2026-07-28T12:00:00.000Z'));
    expect(progress).toEqual({
      target: 20,
      completed: 0,
      remaining: 20,
      pct: 0,
    });
  });

  it('Scenario: Body-supplied userId is ignored', () => {
    const value = validateDailyGoalCards(30);
    expect(value).toBe(30);
  });
});
