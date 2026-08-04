import { ApiError, withErrorHandler } from '@/lib/api-error';
import { reviewRateLimit } from '@/lib/rate-limit/rate-limit';
import { reviewSchema } from '@/features/study/schemas/study.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { reviewCard } from '@/server/services/study/study.service';

export const POST = withErrorHandler(async (req) => {
  const userId = await requireUserId();
  const decision = await reviewRateLimit.check(`review:${userId}`);
  if (decision.limited) {
    throw new ApiError('RATE_LIMITED', 'Too many review submissions', 429, {
      retryAfter: decision.retryAfterSec,
    });
  }

  const body = await req.json();
  const input = reviewSchema.parse(body);
  const result = await reviewCard(
    userId,
    input.cardId,
    input.grade,
    input.responseMs,
    input.clientMutationId
  );
  return Response.json({ data: result });
});
