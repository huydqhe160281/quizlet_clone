import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/rate-limit', () => ({
  authRateLimit: { check: vi.fn(() => false) },
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/server/password', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/password')>();
  return {
    ...actual,
    hashPassword: vi.fn(async (password: string) => `$2a$hashed:${password}`),
  };
});

import { POST } from '@/app/api/v1/auth/register/route';

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_register_duplicate_email: returns 400 when email exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      email: 'taken@example.com',
    });

    const request = new Request('http://localhost/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'taken@example.com',
        password: 'ValidPass123!',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe('EMAIL_ALREADY_EXISTS');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
