import { z } from 'zod';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { SUPPORTED_LOCALES } from '@/lib/i18n/constants';
import { setLocaleCookie, buildLocaleCookieHeader } from '@/lib/i18n/cookies';
import { assertSameOrigin } from '@/lib/i18n/origin';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { requireUserId } from '@/server/auth/auth-utils';
import { getPreferredLocale, setPreferredLocale } from '@/server/services/user/preferences.service';

const patchSchema = z.object({
  preferredLocale: z.enum(SUPPORTED_LOCALES),
});

export const GET = withErrorHandler(async () => {
  const userId = await requireUserId();
  return Response.json({
    data: { preferredLocale: await getPreferredLocale(userId) },
  });
});

export const PATCH = withErrorHandler(async (request) => {
  assertSameOrigin(request);
  const userId = await requireUserId();
  await assertApiRateLimit(request);
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid preferredLocale', 400);
  }

  const preferredLocale = await setPreferredLocale(userId, parsed.data.preferredLocale);
  await setLocaleCookie(parsed.data.preferredLocale);

  const response = Response.json({ data: { preferredLocale } });

  // Also set header for clients that inspect Set-Cookie directly in tests
  response.headers.append('Set-Cookie', buildLocaleCookieHeader(parsed.data.preferredLocale));
  return response;
});
