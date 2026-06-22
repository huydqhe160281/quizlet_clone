import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  intervalMs: number;
  maxRequests: number;
};

type RateLimitEntry = { count: number; resetAt: number };

const createRateLimiter = ({ intervalMs, maxRequests }: RateLimitOptions) => {
  const cache = new LRUCache<string, RateLimitEntry>({ max: 5000 });

  return {
    check(key: string): boolean {
      const now = Date.now();
      const entry = cache.get(key);

      if (!entry || now >= entry.resetAt) {
        cache.set(key, { count: 1, resetAt: now + intervalMs });
        return false;
      }

      if (entry.count >= maxRequests) {
        return true;
      }

      entry.count += 1;
      cache.set(key, entry);
      return false;
    },
  };
};

export const authRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 5 });
export const apiRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 100 });
export const uploadRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 10 });
export const reviewRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 200 });

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}
