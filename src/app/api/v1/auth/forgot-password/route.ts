import { randomBytes } from 'crypto';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { authRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';
import { forgotPasswordSchema } from '@/features/auth/schemas/auth.schema';
import { env } from '@/config/env';
import { prisma } from '@/server/db';
import { resolveEmailLocale, sendPasswordResetEmail } from '@/server/auth/email';
import { hashResetToken } from '@/server/auth/password';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';

export const POST = withErrorHandler(async (req) => {
  const locale = await getRequestLocale();
  const catalog = loadCatalog(locale);

  const ip = getClientIp(req);
  const decision = await authRateLimit.check(`forgot:${ip}`);
  if (decision.limited) {
    throw new ApiError('RATE_LIMITED', t(catalog, 'errors.rateLimited'), 429, {
      retryAfter: decision.retryAfterSec,
    });
  }

  const body = await req.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      'VALIDATION_ERROR',
      t(catalog, 'errors.validation'),
      400,
      parsed.error.flatten()
    );
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, preferredLocale: true },
  });

  // Enumeration-safe: always return success. devResetUrl ONLY for existing users.
  // For non-existent users, devResetUrl is NEVER included (not even in dev mode).
  let devResetUrl: string | undefined;

  if (user) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(token);
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: { identifier: email, token: tokenHash, expires },
    });

    const resetUrl = `${env.authUrl}/reset-password?token=${token}`;
    const emailLocale = resolveEmailLocale(user.preferredLocale, locale);

    if (env.resendApiKey) {
      await sendPasswordResetEmail(email, resetUrl, emailLocale);
    } else if (env.nodeEnv !== 'production') {
      devResetUrl = resetUrl;
    }
  }

  return Response.json({
    data: {
      message: 'If an account exists, a reset link has been sent.',
      ...(devResetUrl ? { devResetUrl } : {}),
    },
  });
});
