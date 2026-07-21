import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiError } from '@/lib/api-error';

const aiGenerateRateLimitMock = vi.hoisted(() => ({
  check: vi.fn(async () => ({ limited: false, retryAfterSec: 60 })),
}));

vi.mock('@/lib/rate-limit/rate-limit', () => ({
  aiGenerateRateLimit: aiGenerateRateLimitMock,
}));

import { assertAiGenerateRateLimit } from '@/lib/rate-limit/ai-rate-limit-guard';

describe('ai-rate-limit-guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario: Rate limit exceeded', async () => {
    aiGenerateRateLimitMock.check.mockResolvedValue({ limited: true, retryAfterSec: 60 });
    await expect(assertAiGenerateRateLimit('user-1')).rejects.toThrow(ApiError);
    await expect(assertAiGenerateRateLimit('user-1')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
    });
  });

  it('allows request when under limit', async () => {
    aiGenerateRateLimitMock.check.mockResolvedValue({ limited: false, retryAfterSec: 60 });
    await expect(assertAiGenerateRateLimit('user-1')).resolves.toBeUndefined();
  });
});
