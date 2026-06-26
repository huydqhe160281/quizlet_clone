import { Prisma } from '@prisma/client';
import { ApiError } from '@/lib/api-error';
import { prisma } from '@/server/db';

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const dayDiff = (a: Date, b: Date) => {
  const msPerDay = 86_400_000;
  return Math.floor((startOfUtcDay(a).getTime() - startOfUtcDay(b).getTime()) / msPerDay);
};

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

export async function updateStreak(userId: string, studiedAt = new Date()) {
  const stats = await ensureUserStats(userId);
  const today = startOfUtcDay(studiedAt);

  let currentStreak = stats.currentStreak;
  let longestStreak = stats.longestStreak;
  let lastStudiedDate = stats.lastStudiedDate;

  if (!lastStudiedDate || dayDiff(today, lastStudiedDate) !== 0) {
    const gap = lastStudiedDate ? dayDiff(today, lastStudiedDate) : null;
    currentStreak = gap === 1 ? stats.currentStreak + 1 : 1;
    longestStreak = Math.max(stats.longestStreak, currentStreak);
    lastStudiedDate = today;
  }

  return prisma.userStats.update({
    where: { userId },
    data: {
      currentStreak,
      longestStreak,
      lastStudiedDate,
      totalReviews: { increment: 1 },
    },
  });
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
  const [totalSets, totalCards, dueCount] = await Promise.all([
    prisma.flashcardSet.count({ where: { userId } }),
    prisma.flashcard.count({ where: { set: { userId } } }),
    prisma.cardProgress.count({
      where: { userId, dueDate: { lte: new Date() } },
    }),
  ]);

  const accuracy = stats.totalReviews > 0 ? stats.totalCorrect / stats.totalReviews : 0;

  return {
    currentStreak: stats.currentStreak,
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
  const today = startOfUtcDay(studiedAt);
  if (lastStudiedDate && dayDiff(today, lastStudiedDate) === 0) {
    return { currentStreak, longestStreak };
  }
  const gap = lastStudiedDate ? dayDiff(today, lastStudiedDate) : null;
  const nextStreak = gap === 1 ? currentStreak + 1 : 1;
  return {
    currentStreak: nextStreak,
    longestStreak: Math.max(longestStreak, nextStreak),
  };
}

export async function getDashboardStats(userId: string) {
  if (!userId) {
    throw new ApiError('UNAUTHORIZED', 'Not authenticated', 401);
  }
  return getStats(userId);
}
