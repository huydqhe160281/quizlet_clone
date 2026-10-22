import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({ $queryRaw: vi.fn(), $transaction: vi.fn() }));
vi.mock('@/server/db', () => ({ prisma: prismaMock }));

import { createRateLimiter } from '@/lib/rate-limit/rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts with one atomic upsert, no interactive transaction', async () => {
    const limiter = createRateLimiter({ intervalMs: 60_000, maxRequests: 5 });
    prismaMock.$queryRaw.mockResolvedValue([{ count: 1, resetAt: new Date(Date.now() + 60_000) }]);

    const decision = await limiter.check('login:1.2.3.4');

    expect(decision.limited).toBe(false);
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    const sql = (prismaMock.$queryRaw.mock.calls[0]?.[0] as TemplateStringsArray).join('?');
    expect(sql).toContain('ON CONFLICT');
    expect(sql).toContain('RETURNING');
  });

  it('allows exactly maxRequests per window, then limits', async () => {
    const limiter = createRateLimiter({ intervalMs: 60_000, maxRequests: 5 });
    const resetAt = new Date(Date.now() + 30_000);

    prismaMock.$queryRaw.mockResolvedValueOnce([{ count: 5, resetAt }]);
    expect((await limiter.check('k')).limited).toBe(false);

    prismaMock.$queryRaw.mockResolvedValueOnce([{ count: 6, resetAt }]);
    const limited = await limiter.check('k');
    expect(limited.limited).toBe(true);
    expect(limited.retryAfterSec).toBeGreaterThan(25);
    expect(limited.retryAfterSec).toBeLessThanOrEqual(30);
  });

  it('falls back to the in-memory limiter when the database is unavailable', async () => {
    const limiter = createRateLimiter({ intervalMs: 60_000, maxRequests: 2 });
    prismaMock.$queryRaw.mockRejectedValue(new Error('db down'));

    expect((await limiter.check('k')).limited).toBe(false);
    expect((await limiter.check('k')).limited).toBe(false);
    expect((await limiter.check('k')).limited).toBe(true);
  });
});

describe('rateLimitsDisabledForTests', () => {
  it('only honours the E2E flag outside a Vercel production deploy', async () => {
    const { rateLimitsDisabledForTests } = await import('@/lib/rate-limit/rate-limit');
    expect(rateLimitsDisabledForTests({ UNSAFE_DISABLE_RATE_LIMIT_FOR_E2E: '1' } as never)).toBe(
      true
    );
    expect(
      rateLimitsDisabledForTests({
        UNSAFE_DISABLE_RATE_LIMIT_FOR_E2E: '1',
        VERCEL_ENV: 'production',
      } as never)
    ).toBe(false);
    expect(rateLimitsDisabledForTests({} as never)).toBe(false);
  });
});
