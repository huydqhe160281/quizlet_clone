import { withErrorHandler } from '@/lib/api-error';
import { assertSameOrigin } from '@/lib/i18n/origin';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { requireUserId } from '@/server/auth/auth-utils';
import {
  getStreakRestoreStatus,
  restoreStreak,
} from '@/server/services/user/streak-restore.service';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** Restore balance and, when 1–3 days were missed, the offer to restore the lost streak. */
export const GET = withErrorHandler(async () => {
  const userId = await requireUserId();
  return Response.json({ data: await getStreakRestoreStatus(userId) }, { headers: NO_STORE });
});

export const POST = withErrorHandler(async (request) => {
  assertSameOrigin(request);
  const userId = await requireUserId();
  await assertApiRateLimit(request);
  return Response.json({ data: await restoreStreak(userId) }, { headers: NO_STORE });
});
