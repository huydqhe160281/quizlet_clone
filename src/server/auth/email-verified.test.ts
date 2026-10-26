import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));
vi.mock('@/server/db', () => ({ prisma: prismaMock }));

import {
  assertCanPublish,
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
});
