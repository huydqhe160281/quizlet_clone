import { ApiError, withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { createSessionSchema } from '@/features/study/schemas/study.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { createSession } from '@/server/services/study/study.service';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';

export const POST = withErrorHandler(async (req) => {
  await assertApiRateLimit(req);
  const userId = await requireUserId();
  const locale = await getRequestLocale();
  const catalog = loadCatalog(locale);
  const body = await req.json();
  const input = createSessionSchema.parse(body);
  try {
    const { session, streak } = await createSession(
      userId,
      input.setId,
      input.mode,
      input.settings,
      input.cardIds
    );
    return Response.json({ data: session, streak }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DRAW_NO_CARDS') {
      throw new ApiError('DRAW_NO_CARDS', t(catalog, 'study.settings.drawDisabledHint'), 422);
    }
    throw error;
  }
});
