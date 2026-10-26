import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiError } from '@/lib/api-error';

const aiGenerateRateLimitMock = vi.hoisted(() => ({
  check: vi.fn(async () => ({ limited: false, retryAfterSec: 60 })),
}));

const aiGenerateUnverifiedRateLimitMock = vi.hoisted(() => ({
  check: vi.fn(async () => ({ limited: false, retryAfterSec: 60 })),
  release: vi.fn(async () => {}),
}));

vi.mock('@/lib/rate-limit/rate-limit', () => ({
  aiGenerateRateLimit: aiGenerateRateLimitMock,
  aiGenerateUnverifiedRateLimit: aiGenerateUnverifiedRateLimitMock,
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
    await expect(assertAiGenerateRateLimit('user-1')).resolves.toHaveProperty('release');
  });

  it('skips the daily allowance for verified accounts', async () => {
    aiGenerateRateLimitMock.check.mockResolvedValue({ limited: false, retryAfterSec: 60 });
    await assertAiGenerateRateLimit('user-1');
    expect(aiGenerateUnverifiedRateLimitMock.check).not.toHaveBeenCalled();
  });

  it('does not spend the daily allowance when the hourly limit refuses', async () => {
    aiGenerateRateLimitMock.check.mockResolvedValue({ limited: true, retryAfterSec: 60 });
    await expect(
      assertAiGenerateRateLimit('user-1', { emailVerified: false })
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(aiGenerateUnverifiedRateLimitMock.check).not.toHaveBeenCalled();
  });

  it('caps unverified accounts and gives the refused slot back', async () => {
    aiGenerateRateLimitMock.check.mockResolvedValue({ limited: false, retryAfterSec: 60 });
    aiGenerateUnverifiedRateLimitMock.check.mockResolvedValue({
      limited: true,
      retryAfterSec: 600,
    });
    await expect(
      assertAiGenerateRateLimit('user-1', { emailVerified: false })
    ).rejects.toMatchObject({ code: 'AI_QUOTA_UNVERIFIED', status: 429 });
    expect(aiGenerateUnverifiedRateLimitMock.check).toHaveBeenCalledWith(
      'ai-gen-unverified:user-1'
    );
    expect(aiGenerateUnverifiedRateLimitMock.release).toHaveBeenCalledWith(
      'ai-gen-unverified:user-1'
    );
  });

  it('returns a release handle for the unverified slot', async () => {
    aiGenerateRateLimitMock.check.mockResolvedValue({ limited: false, retryAfterSec: 60 });
    aiGenerateUnverifiedRateLimitMock.check.mockResolvedValue({
      limited: false,
      retryAfterSec: 600,
    });
    const quota = await assertAiGenerateRateLimit('user-1', { emailVerified: false });
    expect(aiGenerateUnverifiedRateLimitMock.release).not.toHaveBeenCalled();
    await quota.release();
    expect(aiGenerateUnverifiedRateLimitMock.release).toHaveBeenCalledWith(
      'ai-gen-unverified:user-1'
    );
  });
});
