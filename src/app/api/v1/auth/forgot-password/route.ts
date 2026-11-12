import { after } from 'next/server';
import { ApiError, withErrorHandler, readJsonBody } from '@/lib/api-error';
import { authRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';
import { forgotPasswordSchema } from '@/features/auth/schemas/auth.schema';
import { env } from '@/config/env';
import {
  findPasswordResetUser,
  issuePasswordResetUrl,
} from '@/server/services/auth/password-reset.service';
import { resolveEmailLocale, sendPasswordResetEmail } from '@/server/auth/email';
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

  const body = await readJsonBody(req);
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
  const user = await findPasswordResetUser(email);

  // Enumeration-safe: always return success. devResetUrl ONLY for existing users.
  // For non-existent users, devResetUrl is NEVER included (not even in dev mode).
  let devResetUrl: string | undefined;

  if (user) {
    if (env.resendApiKey) {
      // Token writes and the email send run after the response, so an existing account
      // does not answer measurably slower than an unknown address.
      const emailLocale = resolveEmailLocale(user.preferredLocale, locale);
      after(async () => {
        try {
          await sendPasswordResetEmail(email, await issuePasswordResetUrl(email), emailLocale);
        } catch (error) {
          console.error('[auth] failed to send password reset email', error);
        }
      });
    } else if (env.nodeEnv !== 'production') {
      devResetUrl = await issuePasswordResetUrl(email);
    }
  }

  return Response.json({
    data: {
      message: 'If an account exists, a reset link has been sent.',
      ...(devResetUrl ? { devResetUrl } : {}),
    },
  });
});
