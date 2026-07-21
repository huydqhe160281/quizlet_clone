import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@/server/auth/auth', () => ({
  auth: authMock,
}));

vi.mock('@/server/db', () => ({
  prisma: prismaMock,
}));

import { optionalUserId, requireUserId } from '@/server/auth/auth-utils';

describe('auth-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user id when session and db user exist', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1' } });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(requireUserId()).resolves.toBe('user-1');
  });

  it('throws unauthorized when session user is missing', async () => {
    authMock.mockResolvedValue(null);

    await expect(requireUserId()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('throws unauthorized when session user no longer exists', async () => {
    authMock.mockResolvedValue({ user: { id: 'deleted-user' } });
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(requireUserId()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });

  it('optionalUserId returns null when unauthenticated', async () => {
    authMock.mockResolvedValue(null);

    await expect(optionalUserId()).resolves.toBeNull();
  });
});
