import { timingSafeEqual } from 'crypto';
import { env } from '@/config/env';

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; false for everyone when it is unset. */
export function hasCronSecret(req: Request): boolean {
  const secret = env.cronSecret;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
