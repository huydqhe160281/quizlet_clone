import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  verificationToken: { deleteMany: vi.fn(), create: vi.fn() },
}));
const afterTasks = vi.hoisted(() => [] as Array<() => Promise<void>>);
const sendPasswordResetEmail = vi.hoisted(() => vi.fn());

vi.mock('@/server/db', () => ({ prisma: prismaMock }));
vi.mock('next/server', () => ({ after: (task: () => Promise<void>) => afterTasks.push(task) }));
vi.mock('@/config/env', () => ({
  env: { resendApiKey: 'key', nodeEnv: 'production', authUrl: 'https://app' },
}));
vi.mock('@/server/auth/email', () => ({
  sendPasswordResetEmail,
  resolveEmailLocale: () => 'en',
}));
vi.mock('@/lib/rate-limit/rate-limit', () => ({
  authRateLimit: { check: vi.fn(async () => ({ limited: false, retryAfterSec: 0 })) },
  getClientIp: () => '127.0.0.1',
}));
vi.mock('@/lib/i18n/getRequestLocale', () => ({ getRequestLocale: vi.fn(async () => 'en') }));

import { POST } from './route';

const ctx = { params: Promise.resolve({}) };
const request = () =>
  new Request('http://localhost/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'a@example.com' }),
  });

describe('POST /api/v1/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterTasks.length = 0;
  });

  it('answers an existing account before writing the token or sending mail', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', preferredLocale: 'en' });

    const res = await POST(request(), ctx);
    const known = await res.json();

    expect(prismaMock.verificationToken.create).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(afterTasks).toHaveLength(1);

    await afterTasks[0]!();
    expect(prismaMock.verificationToken.create).toHaveBeenCalled();
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      'a@example.com',
      expect.stringMatching(/^https:\/\/app\/reset-password\?token=[0-9a-f]{64}$/),
      'en'
    );

    prismaMock.user.findUnique.mockResolvedValue(null);
    const unknown = await (await POST(request(), ctx)).json();
    expect(unknown).toEqual(known);
  });
});
