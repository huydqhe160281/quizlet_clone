import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { mergeSetsSchema } from '@/features/sets/schemas/set.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { mergeSets } from '@/server/services/sets/set.service';

export const POST = withErrorHandler(async (req) => {
  await assertApiRateLimit(req);
  const userId = await requireUserId();
  // A malformed body becomes a 400 VALIDATION_ERROR instead of a 500.
  const input = mergeSetsSchema.parse(await req.json().catch(() => null));
  const { set, duplicatesSkipped } = await mergeSets(userId, input);
  return Response.json({ data: set, meta: { duplicatesSkipped } }, { status: 201 });
});
