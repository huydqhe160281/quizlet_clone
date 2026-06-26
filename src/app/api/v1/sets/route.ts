import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { createSetSchema, listSetsQuerySchema } from '@/features/sets/schemas/set.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { createSet, getSets } from '@/server/services/sets/set.service';

export const GET = withErrorHandler(async (req) => {
  const userId = await requireUserId();
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const query = listSetsQuerySchema.parse(params);
  const result = await getSets(userId, query);
  return Response.json(result);
});

export const POST = withErrorHandler(async (req) => {
  assertApiRateLimit(req);
  const userId = await requireUserId();
  const body = await req.json();
  const input = createSetSchema.parse(body);
  const set = await createSet(userId, input);
  return Response.json({ data: set }, { status: 201 });
});
