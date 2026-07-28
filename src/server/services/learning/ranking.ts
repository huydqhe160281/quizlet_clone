import {
  QUEUE_DEFAULT_LIMIT,
  QUEUE_MAX_LIMIT,
  RANK_BONUS_RECENT_FAIL,
  RANK_BOOST_NEW,
  RANK_EASE_PIVOT,
  RANK_WEIGHT_LOW_EASE,
  RANK_WEIGHT_OVERDUE_DAYS,
} from '@/server/services/learning/constants';
import type { LearningQueueItem, QueueReason } from '@/features/today/types';

export type RankableCard = {
  cardId: string;
  setId: string;
  setTitle: string;
  reason: QueueReason;
  dueDate: Date | null;
  easeFactor: number | null;
  frontPreview?: string;
  recentFail?: boolean;
};

const MS_PER_DAY = 86_400_000;

export function clampQueueLimit(limit?: number): number {
  if (limit === undefined || Number.isNaN(limit)) {
    return QUEUE_DEFAULT_LIMIT;
  }
  return Math.min(QUEUE_MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

export function scoreCard(card: RankableCard, now: Date): number {
  let score = 0;

  if (card.reason === 'due' && card.dueDate) {
    const overdueDays = Math.max(0, (now.getTime() - card.dueDate.getTime()) / MS_PER_DAY);
    score += overdueDays * RANK_WEIGHT_OVERDUE_DAYS;
  }

  if (card.easeFactor !== null && card.easeFactor !== undefined) {
    score += (RANK_EASE_PIVOT - card.easeFactor) * RANK_WEIGHT_LOW_EASE;
  }

  if (card.reason === 'weak' || card.recentFail) {
    score += RANK_BONUS_RECENT_FAIL;
  }

  if (card.reason === 'new') {
    score += RANK_BOOST_NEW;
  }

  return score;
}

export function rankAndCap(
  cards: RankableCard[],
  now: Date,
  limit?: number
): { items: LearningQueueItem[]; totalEligible: number } {
  const cappedLimit = clampQueueLimit(limit);
  const scored = cards.map((card) => {
    const score = scoreCard(card, now);
    return {
      cardId: card.cardId,
      setId: card.setId,
      setTitle: card.setTitle,
      reason: card.reason,
      dueDate: card.dueDate ? card.dueDate.toISOString() : null,
      easeFactor: card.easeFactor,
      frontPreview: card.frontPreview,
      score,
      _dueMs: card.dueDate?.getTime() ?? Number.POSITIVE_INFINITY,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a._dueMs !== b._dueMs) return a._dueMs - b._dueMs;
    return a.cardId.localeCompare(b.cardId);
  });

  const totalEligible = scored.length;
  const items: LearningQueueItem[] = scored
    .slice(0, cappedLimit)
    .map(({ _dueMs: _, ...item }) => item);

  return { items, totalEligible };
}
