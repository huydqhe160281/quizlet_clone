import { ApiError, withErrorHandler } from '@/lib/api-error';
import { hasCronSecret } from '@/lib/cron-auth';
import { purgeExpiredBookkeeping } from '@/server/services/maintenance/cleanup.service';

/** Daily Vercel Cron job (see vercel.json); refuses every caller when CRON_SECRET is unset. */
export const GET = withErrorHandler(async (req) => {
  if (!hasCronSecret(req)) {
    throw new ApiError('UNAUTHORIZED', 'Not authorized', 401);
  }

  const result = await purgeExpiredBookkeeping();
  console.info('[cron/cleanup] purged', result);
  return Response.json({ data: result });
});
