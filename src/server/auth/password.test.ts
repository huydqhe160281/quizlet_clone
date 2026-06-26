import { describe, expect, it } from 'vitest';
import { hashPassword, isResetTokenExpired, verifyPassword } from '@/server/auth/password';

describe('password helpers', () => {
  it('test_register_email_valid: hashes password with bcrypt', async () => {
    const hash = await hashPassword('ValidPass123!');
    expect(hash).toMatch(/^\$2[aby]\$/);
    await expect(verifyPassword('ValidPass123!', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('test_reset_token_expiry: rejects expired reset tokens', () => {
    const expired = new Date('2020-01-01T00:00:00.000Z');
    const now = new Date('2026-06-17T00:00:00.000Z');
    expect(isResetTokenExpired(expired, now)).toBe(true);
    expect(isResetTokenExpired(new Date('2030-01-01T00:00:00.000Z'), now)).toBe(false);
  });
});
