import { timingSafeEqual } from 'crypto';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { env } from '@/config/env';
import { purgeExpiredBookkeeping } from '@/server/services/maintenance/cleanup.service';

function hasCronSecret(req: Request): boolean {
  const secret = env.cronSecret;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Daily Vercel Cron job (see vercel.json); refuses every caller when CRON_SECRET is unset. */
export const GET = withErrorHandler(async (req) => {
  if (!hasCronSecret(req)) {
    throw new ApiError('UNAUTHORIZED', 'Not authorized', 401);
  }

  const result = await purgeExpiredBookkeeping();
  console.info('[cron/cleanup] purged', result);
  return Response.json({ data: result });
});
