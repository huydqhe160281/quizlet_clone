import { afterEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
}));
const passwordMock = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
}));
const forgetSessionVersion = vi.hoisted(() => vi.fn());

vi.mock('@/server/db', () => ({ prisma: prismaMock }));
vi.mock('@/server/auth/password', () => passwordMock);
vi.mock('@/server/auth/session-version', () => ({ forgetSessionVersion }));

import { changePassword, getAccountSummary } from '@/server/services/user/account.service';

const input = { currentPassword: 'old-password', newPassword: 'new-password' };

describe('account.service', () => {
  afterEach(() => vi.clearAllMocks());

  it('summarises the account without exposing the hash', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      name: 'Ann',
      email: 'ann@example.com',
      emailVerified: new Date(),
      passwordHash: 'hash',
    });
    await expect(getAccountSummary('u1')).resolves.toEqual({
      name: 'Ann',
      email: 'ann@example.com',
      emailVerified: true,
      hasPassword: true,
    });
  });

  it('rejects accounts without a password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ passwordHash: null });
    await expect(changePassword('u1', input)).rejects.toMatchObject({
      code: 'PASSWORD_NOT_SET',
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rejects a wrong current password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ passwordHash: 'hash' });
    passwordMock.verifyPassword.mockResolvedValue(false);
    await expect(changePassword('u1', input)).rejects.toMatchObject({
      code: 'INVALID_PASSWORD',
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('stores the new hash and revokes existing sessions', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ passwordHash: 'hash' });
    passwordMock.verifyPassword.mockResolvedValue(true);
    await changePassword('u1', input);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'hashed:new-password', sessionVersion: { increment: 1 } },
    });
    expect(forgetSessionVersion).toHaveBeenCalledWith('u1');
  });
});
