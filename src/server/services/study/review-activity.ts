import { prisma } from '@/server/db';

/**
 * Lifetime "reviews" shown on the activity heatmap: spaced reviews + answered session cards,
 * plus the counts a DB trigger archived when their cards/sets/sessions were deleted.
 */
export async function countReviewActivity(userId: string): Promise<number> {
  const [reviews, answers, archived] = await Promise.all([
    prisma.reviewHistory.count({ where: { userId } }),
    prisma.sessionCard.count({ where: { answeredAt: { not: null }, session: { userId } } }),
    prisma.reviewActivityArchive.aggregate({ where: { userId }, _sum: { count: true } }),
  ]);
  return reviews + answers + (archived._sum.count ?? 0);
}
