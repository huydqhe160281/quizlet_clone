import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';

/**
 * Lifetime "reviews" shown on the activity heatmap: spaced reviews + answered session cards,
 * plus the counts archived when their cards/sets were deleted.
 */
export async function countReviewActivity(userId: string): Promise<number> {
  const [reviews, answers, archived] = await Promise.all([
    prisma.reviewHistory.count({ where: { userId } }),
    prisma.sessionCard.count({ where: { answeredAt: { not: null }, session: { userId } } }),
    prisma.reviewActivityArchive.aggregate({ where: { userId }, _sum: { count: true } }),
  ]);
  return reviews + answers + (archived._sum.count ?? 0);
}

export type ArchiveTarget = { setIds: string[] } | { setId: string; cardIds: string[] };

/**
 * Roll the review activity that a set/card delete is about to cascade away into
 * `review_activity_archive` (per user, per UTC day), for every user who studied those cards.
 * Run it in the same transaction as the delete. Write paths and the `ProcessedMutation`
 * replay contract are untouched: this only copies counts out before rows disappear.
 */
export function archiveReviewActivity(target: ArchiveTarget) {
  const reviewFilter =
    'setIds' in target
      ? Prisma.sql`f."setId" = ANY(${target.setIds}::text[])`
      : Prisma.sql`f."setId" = ${target.setId} AND f.id = ANY(${target.cardIds}::text[])`;
  // A session on a deleted set cascades with all its answers, whichever card they point at.
  const sessionFilter =
    'setIds' in target
      ? Prisma.sql`(ss."setId" = ANY(${target.setIds}::text[]) OR ${reviewFilter})`
      : reviewFilter;

  return prisma.$executeRaw`
    INSERT INTO "review_activity_archive" ("userId", "day", "count")
    SELECT "userId", day, SUM(n)::int
    FROM (
      SELECT rh."userId", rh."reviewedAt"::date AS day, COUNT(*) AS n
      FROM "review_history" rh
      INNER JOIN "flashcards" f ON f.id = rh."cardId"
      WHERE ${reviewFilter}
      GROUP BY 1, 2
      UNION ALL
      SELECT ss."userId", sc."answeredAt"::date AS day, COUNT(*) AS n
      FROM "session_cards" sc
      INNER JOIN "study_sessions" ss ON ss.id = sc."sessionId"
      LEFT JOIN "flashcards" f ON f.id = sc."cardId"
      WHERE sc."answeredAt" IS NOT NULL AND ${sessionFilter}
      GROUP BY 1, 2
    ) AS deleted_activity
    GROUP BY 1, 2
    ON CONFLICT ("userId", "day")
    DO UPDATE SET "count" = "review_activity_archive"."count" + EXCLUDED."count"
  `;
}
