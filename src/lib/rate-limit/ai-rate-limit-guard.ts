import { ApiError } from '@/lib/api-error';
import { aiGenerateRateLimit } from '@/lib/rate-limit/rate-limit';

export async function assertAiGenerateRateLimit(userId: string) {
  const decision = await aiGenerateRateLimit.check(`ai-gen:${userId}`);
  if (decision.limited) {
    throw new ApiError('RATE_LIMITED', 'Too many AI generation requests', 429, {
      retryAfter: decision.retryAfterSec,
    });
  }
}
