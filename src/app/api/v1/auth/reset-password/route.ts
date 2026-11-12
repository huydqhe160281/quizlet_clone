import { ApiError, withErrorHandler, readJsonBody } from '@/lib/api-error';
import { resetPasswordSchema } from '@/features/auth/schemas/auth.schema';
import { passwordResetRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';
import { assertRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { resetPasswordWithToken } from '@/server/services/auth/password-reset.service';

export const POST = withErrorHandler(async (req) => {
  // Each attempt costs a token lookup and possibly a password hash; cap guesses per IP.
  await assertRateLimit(passwordResetRateLimit, `reset:${getClientIp(req)}`);

  const parsed = resetPasswordSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
  }

  await resetPasswordWithToken(parsed.data.token, parsed.data.password);

  return Response.json({ data: { message: 'Password updated successfully' } });
});
