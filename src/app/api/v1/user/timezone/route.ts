import { z } from 'zod';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { assertSameOrigin } from '@/lib/i18n/origin';
import { requireUserId } from '@/server/auth/auth-utils';
import { adoptDetectedTimezone } from '@/server/services/learning/study-goals';

const bodySchema = z.object({ timeZone: z.string().min(1).max(64) });

/** Browser-detected zone; applied only while the user still has the default (UTC). */
export const POST = withErrorHandler(async (request) => {
  assertSameOrigin(request);
  const userId = await requireUserId();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid timeZone', 400);
  }
  const result = await adoptDetectedTimezone(userId, parsed.data.timeZone);
  return Response.json({ data: result }, { headers: { 'Cache-Control': 'private, no-store' } });
});
