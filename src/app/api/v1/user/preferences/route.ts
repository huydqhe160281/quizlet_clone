import { z } from 'zod';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { SUPPORTED_LOCALES, isLocale, type Locale } from '@/lib/i18n/constants';
import { setLocaleCookie, buildLocaleCookieHeader } from '@/lib/i18n/cookies';
import { assertSameOrigin } from '@/lib/i18n/origin';
import { requireUserId } from '@/server/auth/auth-utils';
import { prisma } from '@/server/db';

const patchSchema = z.object({
  preferredLocale: z.enum(['vi', 'en', 'ja']),
});

export const GET = withErrorHandler(async () => {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredLocale: true },
  });

  return Response.json({
    data: {
      preferredLocale: user?.preferredLocale ?? null,
    },
  });
});

export const PATCH = withErrorHandler(async (request) => {
  assertSameOrigin(request);
  const userId = await requireUserId();
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid preferredLocale', 400);
  }

  const preferredLocale = parsed.data.preferredLocale as Locale;
  if (!isLocale(preferredLocale) || !SUPPORTED_LOCALES.includes(preferredLocale)) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid preferredLocale', 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { preferredLocale },
    select: { preferredLocale: true },
  });

  await setLocaleCookie(preferredLocale);

  const response = Response.json({
    data: {
      preferredLocale: user.preferredLocale,
    },
  });

  // Also set header for clients that inspect Set-Cookie directly in tests
  response.headers.append('Set-Cookie', buildLocaleCookieHeader(preferredLocale));
  return response;
});
