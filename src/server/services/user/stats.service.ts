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
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  // Single round-trip: union review_history + session_cards, then sum by day.
  const rows = await prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
    SELECT day, SUM(count)::bigint AS count
    FROM (
      SELECT to_char("reviewedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
             COUNT(*)::bigint AS count
      FROM "review_history"
      WHERE "userId" = ${userId} AND "reviewedAt" >= ${since}
      GROUP BY 1
      UNION ALL
      SELECT to_char(sc."answeredAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
             COUNT(*)::bigint AS count
      FROM "session_cards" sc
      INNER JOIN "study_sessions" ss ON ss.id = sc."sessionId"
      WHERE ss."userId" = ${userId}
        AND sc."answeredAt" IS NOT NULL
        AND sc."answeredAt" >= ${since}
      GROUP BY 1
    ) AS activity_days
    GROUP BY day
  `;

  const counts = new Map<string, number>();
  rows.forEach((row) => {
    counts.set(row.day, Number(row.count));
  });

  const today = new Date();
  const endUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const startUtc = endUtc - (days - 1) * 24 * 60 * 60 * 1000;

  return Array.from({ length: days }, (_, index) => {
    const key = new Date(startUtc + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return { date: key, count: counts.get(key) ?? 0 };
  });
}

export async function getRecentSessions(userId: string, limit = 5) {
  // Fetch extra rows so we can collapse multiple in-progress runs of the same set+mode.
  const fetchTake = Math.min(50, Math.max(limit * 8, limit));

  const sessions = await prisma.studySession.findMany({
    where: {
      userId,
      OR: [
        { completedAt: { not: null } },
        { sessionCards: { some: { answeredAt: { not: null } } } },
      ],
    },
    include: {
      set: { select: { id: true, title: true } },
      _count: {
        select: {
          sessionCards: { where: { answeredAt: { not: null } } },
        },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: fetchTake,
  });

  const mapped = sessions.map(({ _count, ...session }) => {
    const answeredCount = _count.sessionCards;
    const progress = session.totalCards > 0 ? Math.min(1, answeredCount / session.totalCards) : 0;
    // `score` / `accuracy` = correct/total when completed; null while in progress.
    const accuracy = session.score;
    return {
      ...session,
      answeredCount,
      progress,
      accuracy,
    };
  });

  const bySetMode = new Map<string, (typeof mapped)[number]>();
  for (const session of mapped) {
    const key = `${session.setId}:${session.mode}`;
    const previous = bySetMode.get(key);
    if (!previous) {
      bySetMode.set(key, session);
      continue;
    }
    bySetMode.set(key, pickPreferredRecentSession(previous, session));
  }

  return Array.from(bySetMode.values())
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, limit);
}

/** Prefer completed, else higher progress, else more recently started. */
function pickPreferredRecentSession<
  T extends {
    completedAt: Date | null;
    progress: number;
    startedAt: Date;
  },
>(a: T, b: T): T {
  const aDone = a.completedAt != null;
  const bDone = b.completedAt != null;
  if (aDone !== bDone) {
    return aDone ? a : b;
  }
  if (a.progress !== b.progress) {
    return a.progress >= b.progress ? a : b;
  }
  return a.startedAt >= b.startedAt ? a : b;
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
