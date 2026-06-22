import { describe, expect, it } from 'vitest';
import { authConfig } from '@/server/auth.config';

describe('session cookie security', () => {
  it('sets httpOnly, SameSite=Lax, and production Secure flag', () => {
    const options = authConfig.cookies?.sessionToken?.options;
    expect(options?.httpOnly).toBe(true);
    expect(options?.sameSite).toBe('lax');
    expect(options?.path).toBe('/');
    expect(options?.secure).toBe(process.env.NODE_ENV === 'production');
  });
});
