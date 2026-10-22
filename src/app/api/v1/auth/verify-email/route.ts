import { ApiError, withErrorHandler } from '@/lib/api-error';
import { authRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';
import { verifyEmailSchema } from '@/features/auth/schemas/auth.schema';
import { verifyEmailToken } from '@/server/auth/email-verification';

export const POST = withErrorHandler(async (req) => {
  const decision = await authRateLimit.check(`verify-email:${getClientIp(req)}`);
  if (decision.limited) {
    throw new ApiError('RATE_LIMITED', 'Too many requests', 429, {
      retryAfter: decision.retryAfterSec,
    });
  }

  const { token } = verifyEmailSchema.parse(await req.json());
  const result = await verifyEmailToken(token);
  if (result === 'invalid') {
    throw new ApiError('TOKEN_INVALID', 'Invalid or expired token', 400);
  }
  if (result === 'expired') {
    throw new ApiError('TOKEN_EXPIRED', 'Verification token has expired', 400);
  }

  return Response.json({ data: { verified: true } });
});
