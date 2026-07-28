import { z } from 'zod';
import { withErrorHandler } from '@/lib/api-error';
import { parseQueryParams } from '@/lib/http/parse-query-params';
import { requireUserId } from '@/server/auth/auth-utils';
import { QUEUE_MAX_LIMIT } from '@/server/services/learning/constants';
import { clampQueueLimit } from '@/server/services/learning/ranking';
import { getTodayPlan } from '@/server/services/learning/today.service';

const PRIVATE_NO_STORE = 'private, no-store';

const querySchema = z.object({
  limit: z.coerce.number().int().optional(),
});

export const GET = withErrorHandler(async (req) => {
  const userId = await requireUserId();
  const params = parseQueryParams(req);
  const parsed = querySchema.parse(params);
  const limit = clampQueueLimit(parsed.limit);

  // Hard ceiling already applied by clampQueueLimit; keep QUEUE_MAX_LIMIT as documented bound.
  void QUEUE_MAX_LIMIT;

  const plan = await getTodayPlan(userId, { limit });

  return Response.json(plan, {
    headers: { 'Cache-Control': PRIVATE_NO_STORE },
  });
});
