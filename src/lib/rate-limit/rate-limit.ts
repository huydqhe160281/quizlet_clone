import { LRUCache } from 'lru-cache';
import { prisma } from '@/server/db';

type RateLimitOptions = {
  intervalMs: number;
  maxRequests: number;
};

type RateLimitEntry = { count: number; resetAt: number };
type RateLimitDecision = { limited: boolean; retryAfterSec: number };

const createRateLimiter = ({ intervalMs, maxRequests }: RateLimitOptions) => {
  const cache = new LRUCache<string, RateLimitEntry>({ max: 5000 });

  const checkLocal = (key: string): RateLimitDecision => {
    const now = Date.now();
    const entry = cache.get(key);

    if (!entry || now >= entry.resetAt) {
      cache.set(key, { count: 1, resetAt: now + intervalMs });
      return {
        limited: false,
        retryAfterSec: Math.ceil(intervalMs / 1000),
      };
    }

    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    if (entry.count >= maxRequests) {
      return { limited: true, retryAfterSec };
    }

    entry.count += 1;
    cache.set(key, entry);
    return { limited: false, retryAfterSec };
  };

  return {
    async check(key: string): Promise<RateLimitDecision> {
      const now = Date.now();
      const nextResetAt = new Date(now + intervalMs);

      try {
        const result = await prisma.$transaction(async (tx) => {
          const existing = await tx.rateLimitBucket.findUnique({
            where: { key },
            select: { count: true, resetAt: true },
          });

          if (!existing || existing.resetAt.getTime() <= now) {
            const upserted = await tx.rateLimitBucket.upsert({
              where: { key },
              create: {
                key,
                count: 1,
                resetAt: nextResetAt,
              },
              update: {
                count: 1,
                resetAt: nextResetAt,
              },
              select: { count: true, resetAt: true },
            });
            return {
              limited: false,
              retryAfterSec: Math.max(1, Math.ceil((upserted.resetAt.getTime() - now) / 1000)),
            } satisfies RateLimitDecision;
          }

          const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt.getTime() - now) / 1000));
          if (existing.count >= maxRequests) {
            return { limited: true, retryAfterSec } satisfies RateLimitDecision;
          }

          await tx.rateLimitBucket.update({
            where: { key },
            data: { count: { increment: 1 } },
          });
          return { limited: false, retryAfterSec } satisfies RateLimitDecision;
        });

        return result;
      } catch {
        // Fallback keeps API available if DB is transiently unavailable.
        return checkLocal(key);
      }
    },
  };
};

export const authRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 5 });
export const apiRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 100 });
export const uploadRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 10 });
export const reviewRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 200 });
export const aiGenerateRateLimit = createRateLimiter({ intervalMs: 3_600_000, maxRequests: 10 });
export const assistantGuestRateLimit = createRateLimiter({
  intervalMs: 3_600_000,
  maxRequests: 20,
});

export function getClientIp(req: Request): string {
  // Prefer provider-populated single-IP headers over spoofable comma chains.
  const providerIp =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-vercel-forwarded-for') ??
    req.headers.get('cf-connecting-ip');
  if (providerIp && providerIp.trim() !== '') {
    return providerIp.trim();
  }

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }

  return 'unknown';
}
