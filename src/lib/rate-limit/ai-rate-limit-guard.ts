import { ApiError } from '@/lib/api-error';
import { AI_GENERATE_UNVERIFIED_DAILY_LIMIT } from '@/lib/auth/verification-policy';
import { aiGenerateRateLimit, aiGenerateUnverifiedRateLimit } from '@/lib/rate-limit/rate-limit';

export type AiGenerateQuota = {
  /** Returns the unverified daily slot when the generation it paid for did not produce a set. */
  release: () => Promise<void>;
};

const NOOP_QUOTA: AiGenerateQuota = { release: async () => {} };

/**
 * Unverified accounts get a small daily allowance on top of the hourly limit, so a
 * throwaway sign-up cannot drain the LLM budget. Verifying the email lifts it.
 * The hourly limit counts every attempt; the daily allowance is meant to count sets, so
 * callers release it when generation fails.
 */
export async function assertAiGenerateRateLimit(
  userId: string,
  { emailVerified = true }: { emailVerified?: boolean } = {}
): Promise<AiGenerateQuota> {
  const decision = await aiGenerateRateLimit.check(`ai-gen:${userId}`);
  if (decision.limited) {
    throw new ApiError('RATE_LIMITED', 'Too many AI generation requests', 429, {
      retryAfter: decision.retryAfterSec,
    });
  }
  if (emailVerified) return NOOP_QUOTA;

  const dailyKey = `ai-gen-unverified:${userId}`;
  const daily = await aiGenerateUnverifiedRateLimit.check(dailyKey);
  const release = () => aiGenerateUnverifiedRateLimit.release(dailyKey);
  if (daily.limited) {
    // A refused request must not use up the allowance either.
    await release();
    throw new ApiError(
      'AI_QUOTA_UNVERIFIED',
      'Verify your email to keep generating sets with AI',
      429,
      { retryAfter: daily.retryAfterSec, limit: AI_GENERATE_UNVERIFIED_DAILY_LIMIT }
    );
  }
  return { release };
}
