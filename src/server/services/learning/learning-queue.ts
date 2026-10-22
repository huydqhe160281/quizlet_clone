import { prisma } from '@/server/db';
import {
  QUEUE_DEFAULT_LIMIT,
  WEAK_EASE_THRESHOLD,
  WEAK_LOOKBACK_DAYS,
} from '@/server/services/learning/constants';
import { clampQueueLimit, rankAndCap, type RankableCard } from '@/server/services/learning/ranking';
import {
  cardIdsWithLatestFail,
  type LatestReviewRow,
} from '@/server/services/learning/weak-latest';
import type { LearningQueueItem } from '@/features/today/types';

const MS_PER_DAY = 86_400_000;

type LatestReviewWithCard = LatestReviewRow & { front: string; setId: string; setTitle: string };

function frontPreview(front: string, max = 80): string {
  if (front.length <= max) return front;
  return `${front.slice(0, max - 1)}…`;
}

export type LearningQueueResult = {
  items: LearningQueueItem[];
  returned: number;
  totalEligible: number;
  /** Uncapped due+weak cards for insights (excludes new). */
  membershipForInsights: LearningQueueItem[];
};

/**
 * Build prioritized learning queue for owned sets only.
 * Due/weak branches explicitly filter `card.set.userId === userId` (not bare getDueCards).
 */
export async function getLearningQueue(
  userId: string,
  options?: { limit?: number; now?: Date }
): Promise<LearningQueueResult> {
  const now = options?.now ?? new Date();
  const limit = clampQueueLimit(options?.limit ?? QUEUE_DEFAULT_LIMIT);
  const weakSince = new Date(now.getTime() - WEAK_LOOKBACK_DAYS * MS_PER_DAY);

  const dueProgress = await prisma.cardProgress.findMany({
    where: {
      userId,
      dueDate: { lte: now },
      card: { set: { userId } },
    },
    include: {
      card: {
        select: {
          id: true,
          front: true,
          setId: true,
          set: { select: { id: true, title: true, userId: true } },
        },
      },
    },
  });

  const dueIds = new Set(dueProgress.map((row) => row.cardId));

  // Not due means dueDate > now, so this is disjoint from the due branch without a NOT IN list.
  const weakByEase = await prisma.cardProgress.findMany({
    where: {
      userId,
      easeFactor: { lt: WEAK_EASE_THRESHOLD },
      dueDate: { gt: now },
      card: { set: { userId } },
    },
    include: {
      card: {
        select: {
          id: true,
          front: true,
          setId: true,
          set: { select: { id: true, title: true, userId: true } },
        },
      },
    },
  });

  // Latest review per owned card in the weak lookback window (DISTINCT ON keeps one row per
  // card in SQL instead of loading the whole window); only AGAIN/HARD counts as weak.
  const latestReviews = await prisma.$queryRaw<LatestReviewWithCard[]>`
    SELECT DISTINCT ON (rh."cardId")
      rh."cardId", rh."grade", f."front", f."setId", s."title" AS "setTitle"
    FROM review_history rh
    JOIN flashcards f ON f."id" = rh."cardId"
    JOIN flashcard_sets s ON s."id" = f."setId"
    WHERE rh."userId" = ${userId}
      AND rh."reviewedAt" >= ${weakSince}
      AND s."userId" = ${userId}
    ORDER BY rh."cardId", rh."reviewedAt" DESC
  `;

  const weakIds = new Set(weakByEase.map((row) => row.cardId));
  const latestFailIds = cardIdsWithLatestFail(latestReviews);
  const failCards: RankableCard[] = [];

  for (const row of latestReviews) {
    if (!latestFailIds.has(row.cardId) || dueIds.has(row.cardId) || weakIds.has(row.cardId)) {
      continue;
    }
    failCards.push({
      cardId: row.cardId,
      setId: row.setId,
      setTitle: row.setTitle,
      reason: 'weak',
      dueDate: null,
      easeFactor: null,
      frontPreview: frontPreview(row.front),
      recentFail: true,
    });
  }

  // New = owned cards with no progress row for this user (NOT EXISTS in SQL). All new cards
  // score the same and tie-break by id, so only the first `limit` can reach the queue;
  // the rest are counted for totalEligible without being loaded.
  const newWhere = {
    set: { userId },
    progress: { none: { userId } },
    ...(failCards.length > 0 ? { id: { notIn: failCards.map((card) => card.cardId) } } : {}),
  };
  const [newCards, newTotal] = await Promise.all([
    prisma.flashcard.findMany({
      where: newWhere,
      select: { id: true, front: true, setId: true, set: { select: { title: true } } },
      orderBy: { id: 'asc' },
      take: limit,
    }),
    prisma.flashcard.count({ where: newWhere }),
  ]);

  const candidates: RankableCard[] = [
    ...dueProgress
      .filter((row) => row.card.set.userId === userId)
      .map((row) => ({
        cardId: row.cardId,
        setId: row.card.setId,
        setTitle: row.card.set.title,
        reason: 'due' as const,
        dueDate: row.dueDate,
        easeFactor: row.easeFactor,
        frontPreview: frontPreview(row.card.front),
      })),
    ...weakByEase
      .filter((row) => row.card.set.userId === userId)
      .map((row) => ({
        cardId: row.cardId,
        setId: row.card.setId,
        setTitle: row.card.set.title,
        reason: 'weak' as const,
        dueDate: row.dueDate,
        easeFactor: row.easeFactor,
        frontPreview: frontPreview(row.card.front),
        recentFail: false,
      })),
    ...failCards,
    ...newCards.map((card) => ({
      cardId: card.id,
      setId: card.setId,
      setTitle: card.set.title,
      reason: 'new' as const,
      dueDate: null,
      easeFactor: null,
      frontPreview: frontPreview(card.front),
    })),
  ];

  const ranked = rankAndCap(candidates, now, limit);
  const items = ranked.items;
  const totalEligible = ranked.totalEligible + Math.max(0, newTotal - newCards.length);

  // Uncapped due+weak membership for retention weakSets (excludes `new`).
  const membershipForInsights: LearningQueueItem[] = candidates
    .filter((c) => c.reason === 'due' || c.reason === 'weak')
    .map((c) => ({
      cardId: c.cardId,
      setId: c.setId,
      setTitle: c.setTitle,
      reason: c.reason,
      dueDate: c.dueDate ? c.dueDate.toISOString() : null,
      easeFactor: c.easeFactor,
      frontPreview: c.frontPreview,
    }));

  return { items, returned: items.length, totalEligible, membershipForInsights };
}
