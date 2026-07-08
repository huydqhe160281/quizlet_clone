import { Prisma } from '@prisma/client';
import { ApiError } from '@/lib/api-error';
import { prisma } from '@/server/db';

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const dayDiff = (a: Date, b: Date) => {
  const msPerDay = 86_400_000;
  return Math.floor((startOfUtcDay(a).getTime() - startOfUtcDay(b).getTime()) / msPerDay);
};

/** Streak visible to user: 0 if more than 1 calendar day since last study. */
export function getEffectiveStreak(
  currentStreak: number,
  lastStudiedDate: Date | null,
  now = new Date()
): number {
  if (!lastStudiedDate || currentStreak <= 0) {
    return 0;
  }
  const gap = dayDiff(startOfUtcDay(now), lastStudiedDate);
  if (gap <= 1) {
    return currentStreak;
  }
  return 0;
}

function computeNextStreak(
  currentStreak: number,
  longestStreak: number,
  lastStudiedDate: Date | null,
  studiedAt: Date
) {
  const today = startOfUtcDay(studiedAt);

  if (lastStudiedDate && dayDiff(today, lastStudiedDate) === 0) {
    return {
      currentStreak,
      longestStreak,
      lastStudiedDate,
      changed: false,
    };
  }

  const gap = lastStudiedDate ? dayDiff(today, lastStudiedDate) : null;
  const nextStreak = gap === 1 ? currentStreak + 1 : 1;

  return {
    currentStreak: nextStreak,
    longestStreak: Math.max(longestStreak, nextStreak),
    lastStudiedDate: today,
    changed: true,
  };
}

export async function ensureUserStats(userId: string) {
  const existing = await prisma.userStats.findUnique({ where: { userId } });
  if (existing) {
    return existing;
  }

  try {
    return await prisma.userStats.create({ data: { userId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const row = await prisma.userStats.findUnique({ where: { userId } });
      if (row) {
        return row;
      }
    }
    throw error;
  }
}

/** Record study activity once per UTC day (session start, review, etc.). */
export async function recordDailyStudyActivity(userId: string, studiedAt = new Date()) {
  const stats = await ensureUserStats(userId);
  const next = computeNextStreak(
    stats.currentStreak,
    stats.longestStreak,
    stats.lastStudiedDate,
    studiedAt
  );

  if (!next.changed) {
    return { stats, changed: false as const };
  }

  const updated = await prisma.userStats.update({
    where: { userId },
    data: {
      currentStreak: next.currentStreak,
      longestStreak: next.longestStreak,
      lastStudiedDate: next.lastStudiedDate,
    },
  });

  return { stats: updated, changed: true as const };
}

export async function updateStreak(userId: string, studiedAt = new Date()) {
  const stats = await ensureUserStats(userId);
  const next = computeNextStreak(
    stats.currentStreak,
    stats.longestStreak,
    stats.lastStudiedDate,
    studiedAt
  );

  return prisma.userStats.update({
    where: { userId },
    data: {
      currentStreak: next.currentStreak,
      longestStreak: next.longestStreak,
      lastStudiedDate: next.lastStudiedDate,
      totalReviews: { increment: 1 },
    },
  });
}

export async function getStreakSnapshot(userId: string) {
  const stats = await ensureUserStats(userId);
  const currentStreak = getEffectiveStreak(stats.currentStreak, stats.lastStudiedDate);

  if (currentStreak === 0 && stats.currentStreak > 0) {
    await prisma.userStats.update({
      where: { userId },
      data: { currentStreak: 0 },
    });
  }

  return {
    currentStreak,
    longestStreak: stats.longestStreak,
    lastStudiedDate: stats.lastStudiedDate?.toISOString() ?? null,
  };
}

export async function recordReviewStats(userId: string, isCorrect: boolean) {
  await updateStreak(userId);
  if (isCorrect) {
    await prisma.userStats.update({
      where: { userId },
      data: { totalCorrect: { increment: 1 } },
    });
  }
}

export async function getStats(userId: string) {
  const stats = await ensureUserStats(userId);
  const currentStreak = getEffectiveStreak(stats.currentStreak, stats.lastStudiedDate);
  const [totalSets, totalCards, dueCount] = await Promise.all([
    prisma.flashcardSet.count({ where: { userId } }),
    prisma.flashcard.count({ where: { set: { userId } } }),
    prisma.cardProgress.count({
      where: { userId, dueDate: { lte: new Date() } },
    }),
  ]);

  const accuracy = stats.totalReviews > 0 ? stats.totalCorrect / stats.totalReviews : 0;

  return {
    currentStreak,
    longestStreak: stats.longestStreak,
    totalReviews: stats.totalReviews,
    totalCorrect: stats.totalCorrect,
    accuracy,
    totalSets,
    totalCards,
    dueToday: dueCount,
  };
}

export async function getActivity(userId: string, days = 365) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const reviews = await prisma.reviewHistory.findMany({
    where: { userId, reviewedAt: { gte: since } },
    select: { reviewedAt: true },
  });

  const counts = new Map<string, number>();
  reviews.forEach((review) => {
    const key = review.reviewedAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getRecentSessions(userId: string, limit = 5) {
  return prisma.studySession.findMany({
    where: { userId, completedAt: { not: null } },
    include: {
      set: { select: { id: true, title: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}

export function calculateStreakAfterReview(
  currentStreak: number,
  longestStreak: number,
  lastStudiedDate: Date | null,
  studiedAt: Date
) {
  const next = computeNextStreak(currentStreak, longestStreak, lastStudiedDate, studiedAt);
  return {
    currentStreak: next.currentStreak,
    longestStreak: next.longestStreak,
  };
}

export async function getDashboardStats(userId: string) {
  if (!userId) {
    throw new ApiError('UNAUTHORIZED', 'Not authenticated', 401);
  }
  return getStats(userId);
}
