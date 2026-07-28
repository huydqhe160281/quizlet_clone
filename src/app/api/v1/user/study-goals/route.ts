import { z } from 'zod';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { requireUserId } from '@/server/auth/auth-utils';
import { GOAL_MAX, GOAL_MIN } from '@/server/services/learning/constants';
import { updateDailyGoalCards } from '@/server/services/learning/study-goals';

const PRIVATE_NO_STORE = 'private, no-store';

const patchSchema = z.object({
  dailyGoalCards: z.number().int().min(GOAL_MIN).max(GOAL_MAX),
});

export const PATCH = withErrorHandler(async (req) => {
  const userId = await requireUserId();
  const body = await req.json().catch(() => null);
  // Intentionally strip any client-supplied userId — never trust body.userId.
  const { userId: _ignored, ...rest } =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  void _ignored;

  const parsed = patchSchema.safeParse(rest);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid dailyGoalCards', 400);
  }

  const result = await updateDailyGoalCards(userId, parsed.data.dailyGoalCards);

  return Response.json(result, {
    headers: { 'Cache-Control': PRIVATE_NO_STORE },
  });
});
