import { getLearningQueue } from '@/server/services/learning/learning-queue';
import { getGoalProgress } from '@/server/services/learning/study-goals';
import { getRetentionInsights } from '@/server/services/learning/retention-insights';
import { buildRecommendation } from '@/server/services/learning/recommendation';
import { clampQueueLimit } from '@/server/services/learning/ranking';
import { QUEUE_DEFAULT_LIMIT } from '@/server/services/learning/constants';
import type { TodayPlan } from '@/features/today/types';

export async function getTodayPlan(
  userId: string,
  options?: { limit?: number; now?: Date }
): Promise<TodayPlan> {
  const now = options?.now ?? new Date();
  const limit = clampQueueLimit(options?.limit ?? QUEUE_DEFAULT_LIMIT);

  const [goal, queue] = await Promise.all([
    getGoalProgress(userId, now),
    getLearningQueue(userId, { limit, now }),
  ]);

  const insights = await getRetentionInsights(
    userId,
    queue.membershipForInsights,
    now,
    goal.preferredTimezone
  );
  const recommendation = buildRecommendation(queue.items, queue.totalEligible);

  return {
    goal,
    queue: {
      items: queue.items,
      returned: queue.returned,
      totalEligible: queue.totalEligible,
    },
    insights,
    recommendation,
  };
}
