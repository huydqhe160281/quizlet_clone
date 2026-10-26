import { LRUCache } from 'lru-cache';
import { AI_GENERATE_UNVERIFIED_DAILY_LIMIT } from '@/lib/auth/verification-policy';
import { prisma } from '@/server/db';

type RateLimitOptions = {
  intervalMs: number;
  maxRequests: number;
};

type RateLimitEntry = { count: number; resetAt: number };
type RateLimitDecision = { limited: boolean; retryAfterSec: number };

/**
 * E2E runs register many accounts from one IP and would hit the auth limits. The
 * Playwright web server sets this flag; it is ignored on a Vercel production deploy so a
 * stray env var cannot switch limits off for real users.
 */
export function rateLimitsDisabledForTests(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.UNSAFE_DISABLE_RATE_LIMIT_FOR_E2E === '1' && env.VERCEL_ENV !== 'production';
}

export const createRateLimiter = ({ intervalMs, maxRequests }: RateLimitOptions) => {
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
      if (rateLimitsDisabledForTests()) {
        return { limited: false, retryAfterSec: 0 };
      }
      const now = new Date();
      const nextResetAt = new Date(now.getTime() + intervalMs);

      try {
        // One atomic statement: concurrent requests cannot all read "under the limit"
        // (the old read-then-update let parallel bursts through), and it costs one
        // round trip instead of an interactive transaction.
        const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
          INSERT INTO rate_limit_buckets ("key", "count", "resetAt", "updatedAt")
          VALUES (${key}, 1, ${nextResetAt}, ${now})
          ON CONFLICT ("key") DO UPDATE SET
            "count" = CASE WHEN rate_limit_buckets."resetAt" <= ${now} THEN 1
                           ELSE rate_limit_buckets."count" + 1 END,
            "resetAt" = CASE WHEN rate_limit_buckets."resetAt" <= ${now} THEN ${nextResetAt}
                             ELSE rate_limit_buckets."resetAt" END,
            "updatedAt" = ${now}
          RETURNING "count", "resetAt"
        `;
        const bucket = rows[0];
        if (!bucket) throw new Error('rate limit upsert returned no row');

        const retryAfterSec = Math.max(
          1,
          Math.ceil((new Date(bucket.resetAt).getTime() - now.getTime()) / 1000)
        );
        return { limited: Number(bucket.count) > maxRequests, retryAfterSec };
      } catch {
        // Fallback keeps API available if DB is transiently unavailable.
        return checkLocal(key);
      }
    },

    /** Gives back one counted request, e.g. when the work it paid for failed. */
    async release(key: string): Promise<void> {
      if (rateLimitsDisabledForTests()) return;
      const entry = cache.get(key);
      if (entry && entry.count > 0) cache.set(key, { ...entry, count: entry.count - 1 });
      try {
        await prisma.$executeRaw`
          UPDATE rate_limit_buckets SET "count" = GREATEST("count" - 1, 0), "updatedAt" = ${new Date()}
          WHERE "key" = ${key} AND "resetAt" > ${new Date()}
        `;
      } catch {
        // Best effort: the slot simply stays used until the window resets.
      }
    },
  };
};

export const authRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 5 });
export const apiRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 100 });
export const uploadRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 10 });
export const reviewRateLimit = createRateLimiter({ intervalMs: 60_000, maxRequests: 200 });
export const aiGenerateRateLimit = createRateLimiter({ intervalMs: 3_600_000, maxRequests: 10 });
export const aiGenerateUnverifiedRateLimit = createRateLimiter({
  intervalMs: 86_400_000,
  maxRequests: AI_GENERATE_UNVERIFIED_DAILY_LIMIT,
});
export const assistantGuestRateLimit = createRateLimiter({
  intervalMs: 3_600_000,
  maxRequests: 20,
});
/** Signed-in assistant usage; keyed by user id so one account cannot proxy the LLM freely. */
export const assistantUserRateLimit = createRateLimiter({
  intervalMs: 3_600_000,
  maxRequests: 60,
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
