import { ApiError } from '@/lib/api-error';
import { prisma } from '@/server/db';
import { zonedCalendarDay } from '@/server/services/learning/zoned-day';
import { dayDiff, ensureUserStats } from '@/server/services/user/stats.service';

export const MAX_STREAK_RESTORES = 5;
export const MONTHLY_STREAK_RESTORES = 3;
export const REVIEWS_PER_RESTORE = 400;
export const MAX_RESTORABLE_MISSED_DAYS = 3;

const DAY_MS = 86_400_000;

type RestoreStats = {
  currentStreak: number;
  longestStreak: number;
  lastStudiedDate: Date | null;
  preferredTimezone: string;
  streakRestores: number;
  streakRestoresMonth: string | null;
  streakRestoreCredited: number | null;
  brokenStreak: number;
  brokenStreakLastDate: Date | null;
};

export type RestoreOffer = {
  /** Streak that will be shown after restoring (before any study today). */
  streak: number;
  missedDays: number;
  cost: number;
  affordable: boolean;
  studiedToday: boolean;
};

/** "YYYY-MM" of `now` in `timeZone`. */
export function zonedMonthKey(now: Date, timeZone: string): string {
  return zonedCalendarDay(now, timeZone).toISOString().slice(0, 7);
}

/** Pure balance update: monthly top-up, then 1 restore per 400 new review activity units. */
export function syncRestoreBalance(
  stats: Pick<RestoreStats, 'streakRestores' | 'streakRestoresMonth' | 'streakRestoreCredited'>,
  month: string,
  activity: number
) {
  let balance = Math.min(stats.streakRestores, MAX_STREAK_RESTORES);
  let restoresMonth = stats.streakRestoresMonth;
  if (restoresMonth === null) {
    restoresMonth = month;
  } else if (restoresMonth !== month) {
    balance = Math.max(balance, MONTHLY_STREAK_RESTORES);
    restoresMonth = month;
  }

  // Deleting a set cascades its reviews away; never leave the credited mark above what exists.
  let credited = Math.min(stats.streakRestoreCredited ?? activity, activity);
  const earned = Math.floor(Math.max(0, activity - credited) / REVIEWS_PER_RESTORE);
  if (earned > 0) {
    balance = Math.min(MAX_STREAK_RESTORES, balance + earned);
    credited += earned * REVIEWS_PER_RESTORE;
  }

  return {
    streakRestores: balance,
    streakRestoresMonth: restoresMonth,
    streakRestoreCredited: credited,
  };
}

/** The lost streak the user can still restore, if 1–3 days were missed. */
export function computeRestoreOffer(stats: RestoreStats, now: Date): RestoreOffer | null {
  const today = zonedCalendarDay(now, stats.preferredTimezone);
  const last = stats.lastStudiedDate;

  let lost: { streak: number; lastDate: Date; studiedToday: boolean } | null = null;
  if (stats.currentStreak > 0 && last && dayDiff(today, last) >= 2) {
    // Expired but not yet recorded as broken.
    lost = { streak: stats.currentStreak, lastDate: last, studiedToday: false };
  } else if (stats.brokenStreak > 0 && stats.brokenStreakLastDate) {
    const studiedToday = stats.currentStreak === 1 && last !== null && dayDiff(today, last) === 0;
    const notStudiedSince =
      stats.currentStreak === 0 && last !== null && dayDiff(last, stats.brokenStreakLastDate) === 0;
    if (studiedToday || notStudiedSince) {
      lost = { streak: stats.brokenStreak, lastDate: stats.brokenStreakLastDate, studiedToday };
    }
  }
  if (!lost) return null;

  const missedDays = dayDiff(today, lost.lastDate) - 1;
  if (missedDays < 1 || missedDays > MAX_RESTORABLE_MISSED_DAYS) return null;

  return {
    streak: lost.streak,
    missedDays,
    cost: missedDays,
    affordable: stats.streakRestores >= missedDays,
    studiedToday: lost.studiedToday,
  };
}

/** Heatmap metric: spaced reviews + answered session cards. */
async function countReviewActivity(userId: string): Promise<number> {
  const [reviews, answers] = await Promise.all([
    prisma.reviewHistory.count({ where: { userId } }),
    prisma.sessionCard.count({ where: { answeredAt: { not: null }, session: { userId } } }),
  ]);
  return reviews + answers;
}

async function loadSyncedStats(userId: string, now: Date) {
  const stats = await ensureUserStats(userId);
  const month = zonedMonthKey(now, stats.preferredTimezone);
  const activity = await countReviewActivity(userId);
  const balance = syncRestoreBalance(stats, month, activity);
  const changed =
    balance.streakRestores !== stats.streakRestores ||
    balance.streakRestoresMonth !== stats.streakRestoresMonth ||
    balance.streakRestoreCredited !== stats.streakRestoreCredited;
  const synced = changed
    ? await prisma.userStats.update({ where: { userId }, data: balance })
    : stats;
  return { stats: synced, activity };
}

export async function getStreakRestoreStatus(userId: string, now = new Date()) {
  const { stats, activity } = await loadSyncedStats(userId, now);
  const progress = activity - (stats.streakRestoreCredited ?? activity);
  return {
    balance: stats.streakRestores,
    maxBalance: MAX_STREAK_RESTORES,
    reviewsPerRestore: REVIEWS_PER_RESTORE,
    /** Reviews still needed for the next restore; null while the balance is full. */
    reviewsToNext:
      stats.streakRestores >= MAX_STREAK_RESTORES ? null : REVIEWS_PER_RESTORE - progress,
    offer: computeRestoreOffer(stats, now),
  };
}

export async function restoreStreak(userId: string, now = new Date()) {
  const { stats } = await loadSyncedStats(userId, now);
  const offer = computeRestoreOffer(stats, now);
  if (!offer) {
    throw new ApiError('CONFLICT', 'No streak to restore', 409);
  }
  if (!offer.affordable) {
    throw new ApiError('CONFLICT', 'Not enough streak restores', 409);
  }

  const today = zonedCalendarDay(now, stats.preferredTimezone);
  const currentStreak = offer.studiedToday ? offer.streak + 1 : offer.streak;
  const lastStudiedDate = offer.studiedToday ? today : new Date(today.getTime() - DAY_MS);

  // Optimistic check: only apply against the row we computed the offer from.
  const { count } = await prisma.userStats.updateMany({
    where: { userId, updatedAt: stats.updatedAt, streakRestores: { gte: offer.cost } },
    data: {
      currentStreak,
      longestStreak: Math.max(stats.longestStreak, currentStreak),
      lastStudiedDate,
      brokenStreak: 0,
      brokenStreakLastDate: null,
      streakRestores: { decrement: offer.cost },
    },
  });
  if (count === 0) {
    throw new ApiError('CONFLICT', 'Streak changed, please retry', 409);
  }

  return {
    currentStreak,
    longestStreak: Math.max(stats.longestStreak, currentStreak),
    balance: stats.streakRestores - offer.cost,
    spent: offer.cost,
  };
}
