import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  userStats: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  reviewHistory: { count: vi.fn() },
  sessionCard: { count: vi.fn() },
}));
vi.mock('@/server/db', () => ({ prisma: prismaMock }));

import { ApiError } from '@/lib/api-error';
import {
  computeRestoreOffer,
  getStreakRestoreStatus,
  restoreStreak,
  syncRestoreBalance,
  zonedMonthKey,
} from './streak-restore.service';

const VN = 'Asia/Ho_Chi_Minh';
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
// 10:00 on 2026-10-28 in Vietnam.
const now = new Date('2026-10-28T03:00:00.000Z');

function stats(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'u1',
    currentStreak: 12,
    longestStreak: 12,
    lastStudiedDate: day('2026-10-25'),
    preferredTimezone: VN,
    streakRestores: 3,
    streakRestoresMonth: '2026-10',
    streakRestoreCredited: 1000,
    brokenStreak: 0,
    brokenStreakLastDate: null,
    updatedAt: new Date('2026-10-25T10:00:00.000Z'),
    ...overrides,
  };
}

describe('syncRestoreBalance', () => {
  const base = { streakRestores: 1, streakRestoresMonth: '2026-10', streakRestoreCredited: 0 };

  it('tops up to 3 in a new month but never lowers a bigger balance', () => {
    expect(syncRestoreBalance(base, '2026-11', 0).streakRestores).toBe(3);
    expect(syncRestoreBalance({ ...base, streakRestores: 4 }, '2026-11', 0).streakRestores).toBe(4);
    expect(syncRestoreBalance(base, '2026-10', 0).streakRestores).toBe(1);
  });

  it('initialises month and credited count without paying out the past', () => {
    expect(
      syncRestoreBalance(
        { streakRestores: 5, streakRestoresMonth: null, streakRestoreCredited: null },
        '2026-10',
        215
      )
    ).toEqual({ streakRestores: 5, streakRestoresMonth: '2026-10', streakRestoreCredited: 215 });
  });

  it('grants 1 per 400 reviews, capped at 5, forfeiting the excess', () => {
    expect(syncRestoreBalance(base, '2026-10', 399).streakRestores).toBe(1);
    expect(syncRestoreBalance(base, '2026-10', 450)).toMatchObject({
      streakRestores: 2,
      streakRestoreCredited: 400,
    });
    expect(syncRestoreBalance({ ...base, streakRestores: 4 }, '2026-10', 900)).toMatchObject({
      streakRestores: 5,
      streakRestoreCredited: 800,
    });
  });

  it('uses the month in the user time zone', () => {
    // 18:00 UTC on Oct 31 is already Nov 1 in Vietnam.
    expect(zonedMonthKey(new Date('2026-10-31T18:00:00.000Z'), VN)).toBe('2026-11');
  });
});

describe('computeRestoreOffer', () => {
  it('offers 1 restore per missed day for an expired streak', () => {
    expect(computeRestoreOffer(stats(), now)).toEqual({
      streak: 12,
      missedDays: 2,
      cost: 2,
      affordable: true,
      studiedToday: false,
    });
  });

  it('marks the offer unaffordable when the balance is short', () => {
    const offer = computeRestoreOffer(
      stats({ lastStudiedDate: day('2026-10-24'), streakRestores: 2 }),
      now
    );
    expect(offer).toMatchObject({ missedDays: 3, affordable: false });
  });

  it('has no offer for an intact streak or a gap longer than 3 days', () => {
    expect(computeRestoreOffer(stats({ lastStudiedDate: day('2026-10-27') }), now)).toBeNull();
    expect(computeRestoreOffer(stats({ lastStudiedDate: day('2026-10-23') }), now)).toBeNull();
  });

  it('offers the captured streak when it was already zeroed', () => {
    const zeroed = stats({
      currentStreak: 0,
      brokenStreak: 12,
      brokenStreakLastDate: day('2026-10-26'),
      lastStudiedDate: day('2026-10-26'),
    });
    expect(computeRestoreOffer(zeroed, now)).toMatchObject({ streak: 12, missedDays: 1 });
  });

  it('offers it after studying today, but not once a new streak has grown', () => {
    const today = stats({
      currentStreak: 1,
      lastStudiedDate: day('2026-10-28'),
      brokenStreak: 12,
      brokenStreakLastDate: day('2026-10-25'),
    });
    expect(computeRestoreOffer(today, now)).toMatchObject({ studiedToday: true, missedDays: 2 });
    const grown = { ...today, currentStreak: 2 };
    expect(computeRestoreOffer(grown, now)).toBeNull();
  });
});

describe('restoreStreak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.reviewHistory.count.mockResolvedValue(600);
    prismaMock.sessionCard.count.mockResolvedValue(400);
    prismaMock.userStats.updateMany.mockResolvedValue({ count: 1 });
  });

  it('keeps the streak, sets yesterday as last study day and spends the cost', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue(stats());
    await expect(restoreStreak('u1', now)).resolves.toEqual({
      currentStreak: 12,
      longestStreak: 12,
      balance: 1,
      spent: 2,
    });
    expect(prismaMock.userStats.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'u1',
        updatedAt: new Date('2026-10-25T10:00:00.000Z'),
        streakRestores: { gte: 2 },
      },
      data: {
        currentStreak: 12,
        longestStreak: 12,
        lastStudiedDate: day('2026-10-27'),
        brokenStreak: 0,
        brokenStreakLastDate: null,
        streakRestores: { decrement: 2 },
      },
    });
  });

  it('counts today on top when the user already studied today', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue(
      stats({
        currentStreak: 1,
        lastStudiedDate: day('2026-10-28'),
        brokenStreak: 12,
        brokenStreakLastDate: day('2026-10-26'),
      })
    );
    await expect(restoreStreak('u1', now)).resolves.toMatchObject({
      currentStreak: 13,
      longestStreak: 13,
      spent: 1,
    });
  });

  it('answers 409 without an offer, when unaffordable, or on a concurrent change', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue(
      stats({ lastStudiedDate: day('2026-10-27') })
    );
    await expect(restoreStreak('u1', now)).rejects.toMatchObject({ status: 409 });

    prismaMock.userStats.findUnique.mockResolvedValue(stats({ streakRestores: 1 }));
    await expect(restoreStreak('u1', now)).rejects.toBeInstanceOf(ApiError);

    prismaMock.userStats.findUnique.mockResolvedValue(stats());
    prismaMock.userStats.updateMany.mockResolvedValue({ count: 0 });
    await expect(restoreStreak('u1', now)).rejects.toMatchObject({ status: 409 });
  });

  it('status reports the balance and reviews left until the next restore', async () => {
    prismaMock.userStats.findUnique.mockResolvedValue(stats({ streakRestoreCredited: 900 }));
    await expect(getStreakRestoreStatus('u1', now)).resolves.toMatchObject({
      balance: 3,
      reviewsToNext: 300,
      offer: { cost: 2 },
    });
    expect(prismaMock.userStats.update).not.toHaveBeenCalled();
  });
});
