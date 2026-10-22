import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  processedMutation: { deleteMany: vi.fn() },
  rateLimitBucket: { deleteMany: vi.fn() },
  verificationToken: { deleteMany: vi.fn() },
}));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));

import { GET } from './route';
import {
  PROCESSED_MUTATION_RETENTION_DAYS,
  purgeExpiredBookkeeping,
} from '@/server/services/maintenance/cleanup.service';

const ctx = { params: Promise.resolve({}) };

function request(authorization?: string) {
  return new Request('http://localhost/api/cron/cleanup', {
    headers: authorization ? { authorization } : {},
  });
}

describe('GET /api/cron/cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.processedMutation.deleteMany.mockResolvedValue({ count: 3 });
    prismaMock.rateLimitBucket.deleteMany.mockResolvedValue({ count: 5 });
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses every caller when CRON_SECRET is not configured', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const res = await GET(request('Bearer '), ctx);
    expect(res.status).toBe(401);
    expect(prismaMock.processedMutation.deleteMany).not.toHaveBeenCalled();
  });

  it('refuses a wrong secret', async () => {
    vi.stubEnv('CRON_SECRET', 'right-secret');
    const res = await GET(request('Bearer wrong-secret'), ctx);
    expect(res.status).toBe(401);
  });

  it('purges expired rows with the right secret', async () => {
    vi.stubEnv('CRON_SECRET', 'right-secret');
    const res = await GET(request('Bearer right-secret'), ctx);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      data: { processedMutations: 3, rateLimitBuckets: 5, verificationTokens: 1 },
    });
  });
});

describe('purgeExpiredBookkeeping', () => {
  it('only deletes rows past their retention', async () => {
    vi.clearAllMocks();
    prismaMock.processedMutation.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.rateLimitBucket.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    const now = new Date('2026-10-22T00:00:00.000Z');

    await purgeExpiredBookkeeping(now);

    const mutationCutoff = prismaMock.processedMutation.deleteMany.mock.calls[0]?.[0].where
      .createdAt.lt as Date;
    expect(now.getTime() - mutationCutoff.getTime()).toBe(
      PROCESSED_MUTATION_RETENTION_DAYS * 86_400_000
    );
    const bucketCutoff = prismaMock.rateLimitBucket.deleteMany.mock.calls[0]?.[0].where.resetAt
      .lt as Date;
    expect(bucketCutoff.getTime()).toBeLessThan(now.getTime());
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { expires: { lt: now } },
    });
  });
});
