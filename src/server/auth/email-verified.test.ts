import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  reviewHistory: { count: vi.fn() },
  sessionCard: { count: vi.fn() },
}));
vi.mock('@/server/db', () => ({ prisma: prismaMock }));

import {
  assertCanPublish,
  assertCanStartStudy,
  getStudyLimitStatus,
  hasVerifiedEmail,
  isEmailConsideredVerified,
} from '@/server/auth/email-verified';

describe('email-verified', () => {
  beforeEach(() => vi.clearAllMocks());

  it('counts confirmed addresses and OAuth-only accounts as verified', () => {
    expect(isEmailConsideredVerified({ emailVerified: new Date(), passwordHash: 'h' })).toBe(true);
    expect(isEmailConsideredVerified({ emailVerified: null, passwordHash: null })).toBe(true);
    expect(isEmailConsideredVerified({ emailVerified: null, passwordHash: 'h' })).toBe(false);
  });

  it('treats a missing user as unverified', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(hasVerifiedEmail('gone')).resolves.toBe(false);
  });

  it('blocks publishing for unverified password accounts', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ emailVerified: null, passwordHash: 'h' });
    await expect(assertCanPublish('u1')).rejects.toMatchObject({
      code: 'EMAIL_NOT_VERIFIED',
      status: 403,
    });
  });

  it('has no study limit once the email counts as verified', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ emailVerified: new Date(), passwordHash: 'h' });
    await expect(getStudyLimitStatus('u1')).resolves.toBeNull();
    await expect(assertCanStartStudy('u1')).resolves.toBeUndefined();
    expect(prismaMock.reviewHistory.count).not.toHaveBeenCalled();
  });

  it('counts spaced reviews plus answered session cards toward the limit', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ emailVerified: null, passwordHash: 'h' });
    prismaMock.reviewHistory.count.mockResolvedValue(150);
    prismaMock.sessionCard.count.mockResolvedValue(49);
    await expect(getStudyLimitStatus('u1')).resolves.toEqual({
      used: 199,
      limit: 200,
      reached: false,
    });
    await expect(assertCanStartStudy('u1')).resolves.toBeUndefined();
  });

  it('blocks starting study for unverified accounts at the limit', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ emailVerified: null, passwordHash: 'h' });
    prismaMock.reviewHistory.count.mockResolvedValue(150);
    prismaMock.sessionCard.count.mockResolvedValue(50);
    await expect(assertCanStartStudy('u1')).rejects.toMatchObject({
      code: 'STUDY_LIMIT_REACHED',
      status: 403,
      details: { used: 200, limit: 200 },
    });
  });
});
