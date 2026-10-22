import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashResetToken } from '@/server/auth/password';

const prismaMock = vi.hoisted(() => ({
  verificationToken: { findUnique: vi.fn(), delete: vi.fn() },
  user: { findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}));
const sessionVersionMock = vi.hoisted(() => ({ forgetSessionVersion: vi.fn() }));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));
vi.mock('@/server/auth/session-version', () => sessionVersionMock);

import { POST } from './route';

const ctx = { params: Promise.resolve({}) };

function request(token: string) {
  return new Request('http://localhost/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password: 'NewPassword123' }),
  });
}

describe('POST /api/v1/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', emailVerified: null });
  });

  it('bumps the session version so other sessions are signed out', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: 'a@example.com',
      token: hashResetToken('raw'),
      expires: new Date(Date.now() + 60_000),
    });

    const res = await POST(request('raw'), ctx);

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({
        passwordHash: expect.any(String),
        sessionVersion: { increment: 1 },
        emailVerified: expect.any(Date),
      }),
    });
    expect(sessionVersionMock.forgetSessionVersion).toHaveBeenCalledWith('u1');
  });

  it('looks tokens up by hash only (a leaked hash is not a valid token)', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(null);

    const res = await POST(request('stored-hash-value'), ctx);

    expect(res.status).toBe(400);
    expect(prismaMock.verificationToken.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.verificationToken.findUnique).toHaveBeenCalledWith({
      where: { token: hashResetToken('stored-hash-value') },
    });
  });

  it('refuses an email-verification token', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: 'verify-email:a@example.com',
      token: hashResetToken('raw'),
      expires: new Date(Date.now() + 60_000),
    });

    const res = await POST(request('raw'), ctx);

    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
