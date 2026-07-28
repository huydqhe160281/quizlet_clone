import { Grade } from '@prisma/client';

export type LatestReviewRow = {
  cardId: string;
  grade: Grade;
};

/**
 * Given reviews ordered by reviewedAt DESC, keep the first row per cardId
 * and return cardIds whose latest grade is AGAIN or HARD.
 */
export function cardIdsWithLatestFail(reviewsDesc: LatestReviewRow[]): Set<string> {
  const seen = new Set<string>();
  const fails = new Set<string>();
  for (const row of reviewsDesc) {
    if (seen.has(row.cardId)) continue;
    seen.add(row.cardId);
    if (row.grade === Grade.AGAIN || row.grade === Grade.HARD) {
      fails.add(row.cardId);
    }
  }
  return fails;
}
