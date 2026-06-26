import { prisma } from '@/server/db';
import type { GuideUserContext } from '@/features/guide/schemas/guide-config.schema';

export async function getGuideUserContext(userId: string): Promise<GuideUserContext> {
  const [setCount, recentSets] = await Promise.all([
    prisma.flashcardSet.count({ where: { userId } }),
    prisma.flashcardSet.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: { id: true },
    }),
  ]);

  return {
    setCount,
    hasSets: setCount > 0,
    recentSetIds: recentSets.map((set) => set.id),
  };
}
