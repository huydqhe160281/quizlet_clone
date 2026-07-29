import { Grade } from '@prisma/client';
import { prisma } from '@/server/db';
import {
  DEFAULT_PREFERRED_TIMEZONE,
  WEAK_LOOKBACK_DAYS,
  WEAK_SETS_LIMIT,
} from '@/server/services/learning/constants';
import { zonedLookbackWindow } from '@/server/services/learning/zoned-day';
import { ensureUserStats, getEffectiveStreak } from '@/server/services/user/stats.service';
import type { LearningQueueItem, RetentionInsights, WeakSetInsight } from '@/features/today/types';

export function aggregateWeakSets(items: LearningQueueItem[]): WeakSetInsight[] {
  const counts = new Map<string, { title: string; count: number }>();

  for (const item of items) {
    if (item.reason === 'new') continue;
    const existing = counts.get(item.setId);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(item.setId, { title: item.setTitle, count: 1 });
    }
  }

  return [...counts.entries()]
    .map(([setId, { title, count }]) => ({ setId, title, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.setId.localeCompare(b.setId);
    })
    .slice(0, WEAK_SETS_LIMIT);
}

export function computeAccuracy(goodOrEasy: number, total: number): number {
  if (total === 0) return 0;
  return goodOrEasy / total;
}

export async function getRetentionInsights(
  userId: string,
  queueItemsForWeakSets: LearningQueueItem[],
  now = new Date(),
  preferredTimezone: string = DEFAULT_PREFERRED_TIMEZONE
): Promise<RetentionInsights> {
  const { since, until } = zonedLookbackWindow(now, preferredTimezone, WEAK_LOOKBACK_DAYS);

  const reviews = await prisma.reviewHistory.findMany({
    where: { userId, reviewedAt: { gte: since, lt: until } },
    select: { grade: true },
  });

  const reviewsLast7Days = reviews.length;
  const goodOrEasy = reviews.filter((r) => r.grade === Grade.GOOD || r.grade === Grade.EASY).length;

  const stats = await ensureUserStats(userId);
  const currentStreak = getEffectiveStreak(stats.currentStreak, stats.lastStudiedDate, now);

  return {
    reviewsLast7Days,
    accuracyLast7Days: computeAccuracy(goodOrEasy, reviewsLast7Days),
    currentStreak,
    weakSets: aggregateWeakSets(queueItemsForWeakSets),
  };
}
