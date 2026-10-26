import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  account: { findUnique: vi.fn() },
  user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  verificationToken: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));
const forgetSessionVersion = vi.hoisted(() => vi.fn());
const sendAccountClaimedEmail = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));
vi.mock('@/server/auth/session-version', () => ({ forgetSessionVersion }));
vi.mock('@/config/env', () => ({ env: { authUrl: 'https://quiz.test' } }));
vi.mock('@/server/auth/email', () => ({
  sendAccountClaimedEmail,
  resolveEmailLocale: (locale: string | null) => locale ?? 'vi',
}));
vi.mock('@/server/auth/email-verification', () => ({
  emailVerificationIdentifier: (email: string) => `verify-email:${email}`,
}));

import {
  GOOGLE_EMAIL_UNVERIFIED_REDIRECT,
  markGoogleEmailVerified,
  prepareGoogleSignIn,
} from '@/server/auth/google-account-claim';

const google = { provider: 'google', providerAccountId: 'g-1' };
const profile = { email: 'Ann@Example.com', email_verified: true };

describe('prepareGoogleSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.account.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockResolvedValue([]);
  });

  it('ignores other providers', async () => {
    await expect(
      prepareGoogleSignIn({ provider: 'credentials', providerAccountId: 'x' }, null)
    ).resolves.toBe(true);
    expect(prismaMock.account.findUnique).not.toHaveBeenCalled();
  });

  it('sends a Google address that Google has not verified back to /login', async () => {
    await expect(prepareGoogleSignIn(google, { ...profile, email_verified: false })).resolves.toBe(
      GOOGLE_EMAIL_UNVERIFIED_REDIRECT
    );
    expect(GOOGLE_EMAIL_UNVERIFIED_REDIRECT).toBe('/login?error=GoogleEmailUnverified');
  });

  it('signs in an already linked Google account without touching the user', async () => {
    prismaMock.account.findUnique.mockResolvedValue({ userId: 'u1' });
    await expect(prepareGoogleSignIn(google, profile)).resolves.toBe(true);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('takes over an unconfirmed password account with the same email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: 'squatter-hash',
      emailVerified: null,
      preferredLocale: 'en',
    });

    await expect(prepareGoogleSignIn(google, profile)).resolves.toBe(true);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'ann@example.com' } })
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        passwordHash: null,
        emailVerified: expect.any(Date),
        sessionVersion: { increment: 1 },
      },
    });
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: { in: ['ann@example.com', 'verify-email:ann@example.com'] } },
    });
    expect(forgetSessionVersion).toHaveBeenCalledWith('u1');
    expect(sendAccountClaimedEmail).toHaveBeenCalledWith(
      'ann@example.com',
      'https://quiz.test/forgot-password',
      'en'
    );
  });

  it('still signs the owner in when the notice email fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: 'squatter-hash',
      emailVerified: null,
      preferredLocale: null,
    });
    sendAccountClaimedEmail.mockRejectedValueOnce(new Error('resend down'));
    await expect(prepareGoogleSignIn(google, profile)).resolves.toBe(true);
  });

  it('keeps the password of a verified account and just links Google', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: 'hash',
      emailVerified: new Date(),
    });
    await expect(prepareGoogleSignIn(google, profile)).resolves.toBe(true);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('lets a brand-new Google user through', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(prepareGoogleSignIn(google, profile)).resolves.toBe(true);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe('markGoogleEmailVerified', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks Google-linked users verified only if they were not already', async () => {
    await markGoogleEmailVerified('u1', google);
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', emailVerified: null },
      data: { emailVerified: expect.any(Date) },
    });
  });

  it('does nothing for other providers', async () => {
    await markGoogleEmailVerified('u1', { provider: 'credentials', providerAccountId: 'x' });
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });
});
