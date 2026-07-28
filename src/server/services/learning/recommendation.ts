import type { LearningQueueItem, Recommendation } from '@/features/today/types';

/**
 * Deterministic recommendation — does NOT create StudySession rows.
 * Order: empty → multi-set spaced → single-set LEARN.
 */
export function buildRecommendation(
  items: LearningQueueItem[],
  totalEligible: number
): Recommendation {
  if (totalEligible === 0 || items.length === 0) {
    return { kind: 'empty', href: '/sets', setId: null, mode: null };
  }

  const setIds = new Set(items.map((item) => item.setId));
  if (setIds.size > 1) {
    return {
      kind: 'spaced',
      href: '/study?source=today',
      setId: null,
      mode: null,
    };
  }

  const setId = items[0]?.setId;
  if (!setId) {
    return { kind: 'empty', href: '/sets', setId: null, mode: null };
  }

  return {
    kind: 'set-session',
    href: `/sets/${setId}/learn`,
    setId,
    mode: 'LEARN',
  };
}
