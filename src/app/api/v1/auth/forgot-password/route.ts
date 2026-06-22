import { randomBytes } from 'crypto';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { authRateLimit, getClientIp } from '@/lib/rate-limit';
import { forgotPasswordSchema } from '@/features/auth/schemas/auth.schema';
import { env } from '@/lib/env';
import { prisma } from '@/server/db';
import { sendPasswordResetEmail } from '@/server/email';

export const POST = withErrorHandler(async (req) => {
  const ip = getClientIp(req);
  if (authRateLimit.check(`forgot:${ip}`)) {
    throw new ApiError('RATE_LIMITED', 'Too many requests', 429);
  }

  const body = await req.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Enumeration-safe: always return success. devResetUrl ONLY for existing users.
  // For non-existent users, devResetUrl is NEVER included (not even in dev mode).
  let devResetUrl: string | undefined;

  if (user) {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const resetUrl = `${env.authUrl}/reset-password?token=${token}`;

    if (env.resendApiKey) {
      // Production path: send real email
      await sendPasswordResetEmail(email, resetUrl);
    } else if (env.nodeEnv !== 'production') {
      // Development-only: expose URL when no Resend key configured
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
