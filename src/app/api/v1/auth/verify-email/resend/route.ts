import { ApiError, withErrorHandler } from '@/lib/api-error';
import { authRateLimit } from '@/lib/rate-limit/rate-limit';
import { assertRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { requireUserId } from '@/server/auth/auth-utils';
import { issueEmailVerification } from '@/server/auth/email-verification';
import { resolveEmailLocale } from '@/server/auth/email';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { prisma } from '@/server/db';

export const POST = withErrorHandler(async () => {
  const userId = await requireUserId();
  await assertRateLimit(authRateLimit, `verify-email-resend:${userId}`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true, preferredLocale: true },
  });
  if (!user) {
    throw new ApiError('UNAUTHORIZED', 'Not authenticated', 401);
  }
  if (user.emailVerified) {
    return Response.json({ data: { alreadyVerified: true } });
  }

  await issueEmailVerification(
    user.email,
    resolveEmailLocale(user.preferredLocale, await getRequestLocale())
  );
  return Response.json({ data: { sent: true } });
});
