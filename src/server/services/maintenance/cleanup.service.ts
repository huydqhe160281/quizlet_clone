import { prisma } from '@/server/db';

const DAY_MS = 86_400_000;

/**
 * Idempotency records only need to outlive the offline queue: a client replays a
 * mutation within days, so 90 days leaves a wide margin before the row is dropped.
 */
export const PROCESSED_MUTATION_RETENTION_DAYS = 90;
/** Keep expired buckets briefly so a window that just ended is not recreated mid-request. */
export const RATE_LIMIT_BUCKET_GRACE_MS = 60 * 60 * 1000;

export type CleanupResult = {
  processedMutations: number;
  rateLimitBuckets: number;
  verificationTokens: number;
};

/** Deletes bookkeeping rows that no request can read any more. */
export async function purgeExpiredBookkeeping(now = new Date()): Promise<CleanupResult> {
  const [processedMutations, rateLimitBuckets, verificationTokens] = await Promise.all([
    prisma.processedMutation.deleteMany({
      where: {
        createdAt: { lt: new Date(now.getTime() - PROCESSED_MUTATION_RETENTION_DAYS * DAY_MS) },
      },
    }),
    prisma.rateLimitBucket.deleteMany({
      where: { resetAt: { lt: new Date(now.getTime() - RATE_LIMIT_BUCKET_GRACE_MS) } },
    }),
    prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
  ]);

  return {
    processedMutations: processedMutations.count,
    rateLimitBuckets: rateLimitBuckets.count,
    verificationTokens: verificationTokens.count,
  };
}
