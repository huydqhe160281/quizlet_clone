import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { updateSetSchema } from '@/features/sets/schemas/set.schema';
import { auth } from '@/server/auth/auth';
import { requireUserId } from '@/server/auth/auth-utils';
import { deleteSet, getSet, updateSet } from '@/server/services/sets/set.service';

export const GET = withErrorHandler(async (_req, { params }) => {
  const { setId } = await params;
  const session = await auth();
  const set = await getSet(setId, session?.user?.id);
  return Response.json({ data: set });
});

export const PATCH = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { setId } = await params;
  const userId = await requireUserId();
  const body = await req.json();
  const input = updateSetSchema.parse(body);
  const set = await updateSet(setId, userId, input);
  return Response.json({ data: set });
});

export const DELETE = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { setId } = await params;
  const userId = await requireUserId();
  await deleteSet(setId, userId);
  return Response.json({ data: { deleted: true } });
});
