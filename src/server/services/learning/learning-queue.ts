import { prisma } from '@/server/db';
import {
  QUEUE_DEFAULT_LIMIT,
  WEAK_EASE_THRESHOLD,
  WEAK_LOOKBACK_DAYS,
} from '@/server/services/learning/constants';
import { clampQueueLimit, rankAndCap, type RankableCard } from '@/server/services/learning/ranking';
import { cardIdsWithLatestFail } from '@/server/services/learning/weak-latest';
import type { LearningQueueItem } from '@/features/today/types';

const MS_PER_DAY = 86_400_000;

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

  const weakByEase = await prisma.cardProgress.findMany({
    where: {
      userId,
      easeFactor: { lt: WEAK_EASE_THRESHOLD },
      cardId: { notIn: [...dueIds] },
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

  // Latest review per card in the weak lookback window; only AGAIN/HARD counts as weak.
  const recentReviews = await prisma.reviewHistory.findMany({
    where: {
      userId,
      reviewedAt: { gte: weakSince },
      card: { set: { userId } },
    },
    orderBy: { reviewedAt: 'desc' },
    select: {
      cardId: true,
      grade: true,
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

  const weakIds = new Set(weakByEase.map((row) => row.cardId));
  const latestFailIds = cardIdsWithLatestFail(recentReviews);
  const failCardIds = new Set<string>();
  const failCards: RankableCard[] = [];
  const cardById = new Map(recentReviews.map((row) => [row.cardId, row.card]));

  for (const cardId of latestFailIds) {
    if (dueIds.has(cardId) || weakIds.has(cardId) || failCardIds.has(cardId)) {
      continue;
    }
    const card = cardById.get(cardId);
    if (!card || card.set.userId !== userId) {
      continue;
    }
    failCardIds.add(cardId);
    failCards.push({
      cardId,
      setId: card.setId,
      setTitle: card.set.title,
      reason: 'weak',
      dueDate: null,
      easeFactor: null,
      frontPreview: frontPreview(card.front),
      recentFail: true,
    });
  }

  const selectedIds = new Set([...dueIds, ...weakIds, ...failCardIds]);

  const progressCardIds = await prisma.cardProgress.findMany({
    where: { userId },
    select: { cardId: true },
  });
  const excludeFromNew = new Set([...progressCardIds.map((row) => row.cardId), ...selectedIds]);

  const newCards = await prisma.flashcard.findMany({
    where: {
      set: { userId },
      ...(excludeFromNew.size > 0 ? { id: { notIn: [...excludeFromNew] } } : {}),
    },
    include: {
      set: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

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

  const { items, totalEligible } = rankAndCap(candidates, now, limit);

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
