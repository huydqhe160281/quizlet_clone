import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { splitSetSchema } from '@/features/sets/schemas/set.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { splitSet } from '@/server/services/sets/set.service';

export const POST = withErrorHandler(async (req, { params }) => {
  await assertApiRateLimit(req);
  const { setId } = await params;
  const userId = await requireUserId();
  const body = await req.json();
  const { chunkSize } = splitSetSchema.parse(body);
  const sets = await splitSet(setId, userId, chunkSize);
  return Response.json({ data: sets }, { status: 201 });
});
