import { ApiError } from '@/lib/api-error';
import { apiRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';

type RateLimiter = {
  check: (key: string) => Promise<{ limited: boolean; retryAfterSec: number }>;
};

/** Throws a 429 `RATE_LIMITED` ApiError when `key` is over `limiter`'s budget. */
export async function assertRateLimit(
  limiter: RateLimiter,
  key: string,
  message = 'Too many requests'
) {
  const decision = await limiter.check(key);
  if (decision.limited) {
    throw new ApiError('RATE_LIMITED', message, 429, {
      retryAfter: decision.retryAfterSec,
    });
  }
}

export async function assertApiRateLimit(req: Request) {
  await assertRateLimit(apiRateLimit, `api:${getClientIp(req)}`);
}
