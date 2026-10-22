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

vi.mock('@/lib/rate-limit/rate-limit', () => ({
  authRateLimit: { check: vi.fn(async () => ({ limited: false, retryAfterSec: 60 })) },
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/server/auth/password', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/auth/password')>();
  return {
    ...actual,
    hashPassword: vi.fn(async (password: string) => `$2a$hashed:${password}`),
  };
});

const verificationMock = vi.hoisted(() => ({ issueEmailVerification: vi.fn() }));
vi.mock('@/server/auth/email-verification', () => verificationMock);
vi.mock('@/lib/i18n/getRequestLocale', () => ({ getRequestLocale: vi.fn(async () => 'ja') }));

import { POST } from '@/app/api/v1/auth/register/route';

function registerRequest(email: string) {
  return new Request('http://localhost/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'ValidPass123!' }),
  });
}

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

  it('sends a verification email after creating the account', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'u1', email: 'new@example.com', name: null });

    const response = await POST(registerRequest('New@Example.com'), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(201);
    expect(verificationMock.issueEmailVerification).toHaveBeenCalledWith('new@example.com', 'ja');
  });

  it('still registers when the verification email cannot be sent', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'u1', email: 'new@example.com', name: null });
    verificationMock.issueEmailVerification.mockRejectedValueOnce(new Error('resend down'));

    const response = await POST(registerRequest('new@example.com'), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(201);
    spy.mockRestore();
  });
});
