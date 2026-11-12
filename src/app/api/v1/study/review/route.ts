import { withErrorHandler, readJsonBody } from '@/lib/api-error';
import { reviewRateLimit } from '@/lib/rate-limit/rate-limit';
import { assertRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { reviewSchema } from '@/features/study/schemas/study.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { reviewCard } from '@/server/services/study/study.service';

export const POST = withErrorHandler(async (req) => {
  const userId = await requireUserId();
  await assertRateLimit(reviewRateLimit, `review:${userId}`, 'Too many review submissions');

  const body = await readJsonBody(req);
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
