import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));

import {
  applySessionVersion,
  clearSessionVersionCache,
  forgetSessionVersion,
} from '@/server/auth/session-version';

describe('session version (JWT revocation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionVersionCache();
  });

  it('stamps the user version on sign-in without a DB read', async () => {
    const token = await applySessionVersion({ sub: 'u1' }, { id: 'u1', sessionVersion: 3 });
    expect(token?.sv).toBe(3);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('reads the version on sign-in when the provider user lacks it', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ sessionVersion: 2 });
    const token = await applySessionVersion({ sub: 'u1' }, { id: 'u1' });
    expect(token?.sv).toBe(2);
  });

  it('keeps a token whose version matches', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ sessionVersion: 1 });
    await expect(applySessionVersion({ sub: 'u1', sv: 1 })).resolves.toMatchObject({ sv: 1 });
  });

  it('treats tokens issued before the field existed as version 0', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ sessionVersion: 0 });
    await expect(applySessionVersion({ sub: 'u1' })).resolves.not.toBeNull();
  });

  it('revokes a token after the password reset bumped the version', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ sessionVersion: 0 });
    await expect(applySessionVersion({ sub: 'u1', sv: 0 })).resolves.not.toBeNull();

    // Reset on this instance: bump + forget the cached value.
    prismaMock.user.findUnique.mockResolvedValueOnce({ sessionVersion: 1 });
    forgetSessionVersion('u1');

    await expect(applySessionVersion({ sub: 'u1', sv: 0 })).resolves.toBeNull();
  });

  it('revokes a token whose user was deleted', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(applySessionVersion({ sub: 'gone', sv: 0 })).resolves.toBeNull();
  });

  it('caches the lookup between reads', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ sessionVersion: 0 });
    await applySessionVersion({ sub: 'u1', sv: 0 });
    await applySessionVersion({ sub: 'u1', sv: 0 });
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it('fails open when the DB check throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMock.user.findUnique.mockRejectedValue(new Error('db down'));
    await expect(applySessionVersion({ sub: 'u1', sv: 0 })).resolves.toMatchObject({ sub: 'u1' });
    spy.mockRestore();
  });
});
