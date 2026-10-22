import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock('@/config/env', () => ({ env: { resendApiKey: 'test-key' } }));

import { sendEmailVerificationEmail, sendPasswordResetEmail } from '@/server/auth/email';

describe('transactional email sending', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('throws when Resend reports an error instead of failing silently', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'recipient not allowed' },
    });

    await expect(
      sendEmailVerificationEmail('a@example.com', 'https://app/verify-email?token=t', 'en')
    ).rejects.toThrow('recipient not allowed');
  });

  it('resolves when Resend accepts the message', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });

    await expect(
      sendPasswordResetEmail('a@example.com', 'https://app/reset-password?token=t', 'vi')
    ).resolves.toBeUndefined();
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@example.com' }));
  });
});
