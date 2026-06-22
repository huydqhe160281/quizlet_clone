import { ApiError, withErrorHandler } from '@/lib/api-error';
import { reviewRateLimit } from '@/lib/rate-limit';
import { reviewSchema } from '@/features/study/schemas/study.schema';
import { requireUserId } from '@/server/auth-utils';
import { reviewCard } from '@/server/services/study.service';

export const POST = withErrorHandler(async (req) => {
  const userId = await requireUserId();
  if (reviewRateLimit.check(`review:${userId}`)) {
    throw new ApiError('RATE_LIMITED', 'Too many review submissions', 429, { retryAfter: 60 });
  }

  const body = await req.json();
  const input = reviewSchema.parse(body);
  const result = await reviewCard(userId, input.cardId, input.grade, input.responseMs);
  return Response.json({ data: result });
});
