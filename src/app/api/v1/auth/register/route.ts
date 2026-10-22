import { ApiError, withErrorHandler } from '@/lib/api-error';
import { authRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';
import { registerSchema } from '@/features/auth/schemas/auth.schema';
import { prisma } from '@/server/db';
import { hashPassword } from '@/server/auth/password';
import { issueEmailVerification } from '@/server/auth/email-verification';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';

export const POST = withErrorHandler(async (req) => {
  const ip = getClientIp(req);
  const decision = await authRateLimit.check(`register:${ip}`);
  if (decision.limited) {
    throw new ApiError('RATE_LIMITED', 'Too many requests', 429, {
      retryAfter: decision.retryAfterSec,
    });
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError('EMAIL_ALREADY_EXISTS', 'Email already registered', 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
    },
    select: { id: true, email: true, name: true },
  });

  try {
    await issueEmailVerification(email, await getRequestLocale());
  } catch (error) {
    // Sign-up must not fail when the mail provider does; the user can resend from the app.
    console.error('[auth] failed to send verification email', error);
  }

  return Response.json({ data: user }, { status: 201 });
});
