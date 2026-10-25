import { ApiError, withErrorHandler } from '@/lib/api-error';
import { changePasswordSchema } from '@/features/auth/schemas/auth.schema';
import { assertSameOrigin } from '@/lib/i18n/origin';
import { authRateLimit } from '@/lib/rate-limit/rate-limit';
import { requireUserId } from '@/server/auth/auth-utils';
import { changePassword } from '@/server/services/user/account.service';

export const POST = withErrorHandler(async (req) => {
  assertSameOrigin(req);
  const userId = await requireUserId();

  // Keyed by user, not IP: this guards the current-password check against guessing.
  const decision = await authRateLimit.check(`change-password:${userId}`);
  if (decision.limited) {
    throw new ApiError('RATE_LIMITED', 'Too many requests', 429, {
      retryAfter: decision.retryAfterSec,
    });
  }

  const input = changePasswordSchema.parse(await req.json().catch(() => null));
  await changePassword(userId, input);

  return Response.json({ data: { message: 'Password updated' } });
});
