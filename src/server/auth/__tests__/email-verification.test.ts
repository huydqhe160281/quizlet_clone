import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashResetToken } from '@/server/auth/password';

const prismaMock = vi.hoisted(() => ({
  verificationToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  user: { updateMany: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}));
const emailMock = vi.hoisted(() => ({ sendEmailVerificationEmail: vi.fn() }));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));
vi.mock('@/server/auth/email', () => emailMock);

import {
  emailVerificationIdentifier,
  issueEmailVerification,
  verifyEmailToken,
} from '@/server/auth/email-verification';

describe('email verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores only the token hash and emails the raw token', async () => {
    await issueEmailVerification('a@example.com', 'en');

    const created = prismaMock.verificationToken.create.mock.calls[0]?.[0].data;
    expect(created.identifier).toBe('verify-email:a@example.com');
    const url = emailMock.sendEmailVerificationEmail.mock.calls[0]?.[1] as string;
    const raw = new URL(url).searchParams.get('token')!;
    expect(created.token).toBe(hashResetToken(raw));
    expect(created.token).not.toBe(raw);
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: 'verify-email:a@example.com' },
    });
  });

  it('marks the address verified and consumes the token', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: emailVerificationIdentifier('a@example.com'),
      token: hashResetToken('raw'),
      expires: new Date(Date.now() + 60_000),
    });

    await expect(verifyEmailToken('raw')).resolves.toBe('verified');
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { email: 'a@example.com', emailVerified: null },
      data: { emailVerified: expect.any(Date) },
    });
    expect(prismaMock.verificationToken.delete).toHaveBeenCalled();
  });

  it('rejects a password-reset token', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: 'a@example.com',
      token: hashResetToken('raw'),
      expires: new Date(Date.now() + 60_000),
    });

    await expect(verifyEmailToken('raw')).resolves.toBe('invalid');
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it('reports expired tokens and deletes them', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: emailVerificationIdentifier('a@example.com'),
      token: hashResetToken('raw'),
      expires: new Date(Date.now() - 1),
    });

    await expect(verifyEmailToken('raw')).resolves.toBe('expired');
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });
});
