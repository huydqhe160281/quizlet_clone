import { ApiError } from '@/lib/api-error';
import { aiGenerateRateLimit } from '@/lib/rate-limit';

export function assertAiGenerateRateLimit(userId: string) {
  if (aiGenerateRateLimit.check(`ai-gen:${userId}`)) {
    throw new ApiError('RATE_LIMITED', 'Too many AI generation requests', 429);
  }
}
