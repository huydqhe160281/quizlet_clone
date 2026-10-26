import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { mergeSetsSchema } from '@/features/sets/schemas/set.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { mergeSets } from '@/server/services/sets/set.service';

export const POST = withErrorHandler(async (req) => {
  await assertApiRateLimit(req);
  const userId = await requireUserId();
  const body = await req.json();
  const input = mergeSetsSchema.parse(body);
  const { set, duplicatesSkipped } = await mergeSets(userId, input);
  return Response.json({ data: set, meta: { duplicatesSkipped } }, { status: 201 });
});
