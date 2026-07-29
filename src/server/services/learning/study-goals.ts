import { ApiError } from '@/lib/api-error';
import { prisma } from '@/server/db';
import {
  DEFAULT_PREFERRED_TIMEZONE,
  GOAL_DEFAULT,
  GOAL_MAX,
  GOAL_MIN,
} from '@/server/services/learning/constants';
import {
  isValidTimeZone,
  nextZonedDay,
  normalizeTimeZone,
  resolveTimeZoneForMath,
  startOfZonedDay,
} from '@/server/services/learning/zoned-day';
import { ensureUserStats, startOfUtcDay } from '@/server/services/user/stats.service';
import type { GoalProgress } from '@/features/today/types';

export function nextUtcDay(date: Date): Date {
  const start = startOfUtcDay(date);
  return new Date(start.getTime() + 86_400_000);
}

export function computeGoalProgress(
  target: number,
  completed: number,
  preferredTimezone: string = DEFAULT_PREFERRED_TIMEZONE
): GoalProgress {
  const safeTarget = Math.max(0, target);
  const safeCompleted = Math.max(0, completed);
  const remaining = Math.max(safeTarget - safeCompleted, 0);
  const pct = safeTarget === 0 ? 0 : Math.min(100, Math.floor((100 * safeCompleted) / safeTarget));
  return {
    target: safeTarget,
    completed: safeCompleted,
    remaining,
    pct,
    preferredTimezone,
  };
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

export function validatePreferredTimezone(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError('VALIDATION_ERROR', 'preferredTimezone must be a non-empty string', 400);
  }
  const trimmed = value.trim();
  if (!isValidTimeZone(trimmed)) {
    throw new ApiError('VALIDATION_ERROR', 'preferredTimezone is not a valid IANA timezone', 400);
  }
  return normalizeTimeZone(trimmed);
}

export async function getGoalProgress(userId: string, now = new Date()): Promise<GoalProgress> {
  const stats = await ensureUserStats(userId);
  const target = stats.dailyGoalCards ?? GOAL_DEFAULT;
  const storedTz = stats.preferredTimezone ?? DEFAULT_PREFERRED_TIMEZONE;
  const tzForMath = resolveTimeZoneForMath(storedTz);
  const dayStart = startOfZonedDay(now, tzForMath);
  const dayEnd = nextZonedDay(now, tzForMath);

  const completed = await prisma.reviewHistory.count({
    where: {
      userId,
      reviewedAt: { gte: dayStart, lt: dayEnd },
    },
  });

  return computeGoalProgress(target, completed, storedTz);
}

export type StudyGoalsPatch = {
  dailyGoalCards?: number;
  preferredTimezone?: string;
};

/**
 * Updates dailyGoalCards and/or preferredTimezone for the authenticated user only.
 * Callers MUST pass userId from requireUserId(); any body.userId is ignored upstream.
 */
export async function updateStudyGoals(userId: string, patch: StudyGoalsPatch) {
  const hasCards = patch.dailyGoalCards !== undefined;
  const hasTz = patch.preferredTimezone !== undefined;
  if (!hasCards && !hasTz) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'At least one of dailyGoalCards or preferredTimezone is required',
      400
    );
  }

  const data: { dailyGoalCards?: number; preferredTimezone?: string } = {};
  if (hasCards) {
    data.dailyGoalCards = validateDailyGoalCards(patch.dailyGoalCards);
  }
  if (hasTz) {
    data.preferredTimezone = validatePreferredTimezone(patch.preferredTimezone);
  }

  await ensureUserStats(userId);
  const updated = await prisma.userStats.update({
    where: { userId },
    data,
    select: { dailyGoalCards: true, preferredTimezone: true },
  });
  return {
    dailyGoalCards: updated.dailyGoalCards,
    preferredTimezone: updated.preferredTimezone,
  };
}

/** @deprecated Prefer updateStudyGoals — kept for narrow callers. */
export async function updateDailyGoalCards(userId: string, dailyGoalCards: number) {
  return updateStudyGoals(userId, { dailyGoalCards });
}
