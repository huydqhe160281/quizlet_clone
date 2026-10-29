import { prisma } from '@/server/db';

/** Lifetime "reviews" shown on the activity heatmap: spaced reviews + answered session cards. */
export async function countReviewActivity(userId: string): Promise<number> {
  const [reviews, answers] = await Promise.all([
    prisma.reviewHistory.count({ where: { userId } }),
    prisma.sessionCard.count({ where: { answeredAt: { not: null }, session: { userId } } }),
  ]);
  return reviews + answers;
}
