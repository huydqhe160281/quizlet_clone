import { ApiError, withErrorHandler, readJsonBody } from '@/lib/api-error';
import { authRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';
import { assertRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { registerSchema } from '@/features/auth/schemas/auth.schema';
import { issueEmailVerification } from '@/server/auth/email-verification';
import { registerUser } from '@/server/services/auth/registration.service';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';

export const POST = withErrorHandler(async (req) => {
  await assertRateLimit(authRateLimit, `register:${getClientIp(req)}`);

  const parsed = registerSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
  }

  const email = parsed.data.email.toLowerCase();
  const user = await registerUser({
    email,
    password: parsed.data.password,
    name: parsed.data.name,
  });

  try {
    await issueEmailVerification(email, await getRequestLocale());
  } catch (error) {
    // Sign-up must not fail when the mail provider does; the user can resend from the app.
    console.error('[auth] failed to send verification email', error);
  }

  return Response.json({ data: user }, { status: 201 });
});
