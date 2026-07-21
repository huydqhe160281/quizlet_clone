import { ApiError } from '@/lib/api-error';
import { apiRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';

export async function assertApiRateLimit(req: Request) {
  const ip = getClientIp(req);
  const decision = await apiRateLimit.check(`api:${ip}`);
  if (decision.limited) {
    throw new ApiError('RATE_LIMITED', 'Too many requests', 429, {
      retryAfter: decision.retryAfterSec,
    });
  }
}
