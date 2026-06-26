import { ApiError } from '@/lib/api-error';
import { apiRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';

export function assertApiRateLimit(req: Request) {
  const ip = getClientIp(req);
  if (apiRateLimit.check(`api:${ip}`)) {
    throw new ApiError('RATE_LIMITED', 'Too many requests', 429);
  }
}
