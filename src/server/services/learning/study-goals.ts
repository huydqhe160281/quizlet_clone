import { ApiError } from '@/lib/api-error';
import { prisma } from '@/server/db';
import { GOAL_DEFAULT, GOAL_MAX, GOAL_MIN } from '@/server/services/learning/constants';
import { ensureUserStats, startOfUtcDay } from '@/server/services/user/stats.service';
import type { GoalProgress } from '@/features/today/types';

export function nextUtcDay(date: Date): Date {
  const start = startOfUtcDay(date);
  return new Date(start.getTime() + 86_400_000);
}

export function computeGoalProgress(target: number, completed: number): GoalProgress {
  const safeTarget = Math.max(0, target);
  const safeCompleted = Math.max(0, completed);
  const remaining = Math.max(safeTarget - safeCompleted, 0);
  const pct = safeTarget === 0 ? 0 : Math.min(100, Math.floor((100 * safeCompleted) / safeTarget));
  return { target: safeTarget, completed: safeCompleted, remaining, pct };
}

export function validateDailyGoalCards(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ApiError('VALIDATION_ERROR', 'dailyGoalCards must be an integer', 400);
  }
  if (value < GOAL_MIN || value > GOAL_MAX) {
    throw new ApiError(
      'VALIDATION_ERROR',
      `dailyGoalCards must be between ${GOAL_MIN} and ${GOAL_MAX}`,
      400
    );
  }
  return value;
}

export async function getGoalProgress(userId: string, now = new Date()): Promise<GoalProgress> {
  const stats = await ensureUserStats(userId);
  const target = stats.dailyGoalCards ?? GOAL_DEFAULT;
  const dayStart = startOfUtcDay(now);
  const dayEnd = nextUtcDay(now);

  const completed = await prisma.reviewHistory.count({
    where: {
      userId,
      reviewedAt: { gte: dayStart, lt: dayEnd },
    },
  });

  return computeGoalProgress(target, completed);
}

/**
 * Updates dailyGoalCards for the authenticated user only.
 * Callers MUST pass userId from requireUserId(); any body.userId is ignored upstream.
 */
export async function updateDailyGoalCards(userId: string, dailyGoalCards: number) {
  const value = validateDailyGoalCards(dailyGoalCards);
  await ensureUserStats(userId);
  const updated = await prisma.userStats.update({
    where: { userId },
    data: { dailyGoalCards: value },
    select: { dailyGoalCards: true },
  });
  return { dailyGoalCards: updated.dailyGoalCards };
}
