import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { requireUserId } from '@/server/auth/auth-utils';
import { duplicateSet } from '@/server/services/sets/set.service';

export const POST = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { setId } = await params;
  const userId = await requireUserId();
  const set = await duplicateSet(setId, userId);
  return Response.json({ data: set }, { status: 201 });
});
