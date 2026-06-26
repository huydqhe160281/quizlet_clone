import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { createSessionSchema } from '@/features/study/schemas/study.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { createSession } from '@/server/services/study/study.service';

export const POST = withErrorHandler(async (req) => {
  assertApiRateLimit(req);
  const userId = await requireUserId();
  const body = await req.json();
  const input = createSessionSchema.parse(body);
  const session = await createSession(userId, input.setId, input.mode, input.settings);
  return Response.json({ data: session }, { status: 201 });
});
