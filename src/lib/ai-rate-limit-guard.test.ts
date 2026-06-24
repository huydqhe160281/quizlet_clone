import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiError } from '@/lib/api-error';

const aiGenerateRateLimitMock = vi.hoisted(() => ({
  check: vi.fn(() => false),
}));

vi.mock('@/lib/rate-limit', () => ({
  aiGenerateRateLimit: aiGenerateRateLimitMock,
}));

import { assertAiGenerateRateLimit } from '@/lib/ai-rate-limit-guard';

describe('ai-rate-limit-guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario: Rate limit exceeded', () => {
    aiGenerateRateLimitMock.check.mockReturnValue(true);
    expect(() => assertAiGenerateRateLimit('user-1')).toThrow(ApiError);
    expect(() => assertAiGenerateRateLimit('user-1')).toThrow(
      expect.objectContaining({ code: 'RATE_LIMITED', status: 429 })
    );
  });

  it('allows request when under limit', () => {
    aiGenerateRateLimitMock.check.mockReturnValue(false);
    expect(() => assertAiGenerateRateLimit('user-1')).not.toThrow();
  });
});
