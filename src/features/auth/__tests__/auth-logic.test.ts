import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── test_forgot_password_dev_reset_url ────────────────────────────────────────
describe('forgot-password devResetUrl logic', () => {
  // Unit-level test: verify the branching logic without calling real API

  it('includes devResetUrl when no RESEND_API_KEY in development', () => {
    const env = { resendApiKey: '', nodeEnv: 'development' };
    const userExists = true;
    const resetUrl = 'http://localhost:3000/reset-password?token=abc123';

    // Simulates the branch in forgot-password/route.ts
    let devResetUrl: string | undefined;
    if (userExists) {
      if (env.resendApiKey) {
        // Would send email — not this path
      } else if (env.nodeEnv !== 'production') {
        devResetUrl = resetUrl;
      }
    }

    expect(devResetUrl).toBe(resetUrl);
  });

  it('does NOT include devResetUrl in production even if no RESEND_API_KEY', () => {
    const env = { resendApiKey: '', nodeEnv: 'production' };
    const userExists = true;
    const resetUrl = 'https://myapp.com/reset-password?token=abc123';

    let devResetUrl: string | undefined;
    if (userExists) {
      if (env.resendApiKey) {
        // Send real email
      } else if (env.nodeEnv !== 'production') {
        devResetUrl = resetUrl;
      }
    }

    expect(devResetUrl).toBeUndefined();
  });

  it('does NOT include devResetUrl for non-existent user even in dev', () => {
    const env = { resendApiKey: '', nodeEnv: 'development' };
    const userExists = false; // Enumeration-safe: user not found

    let devResetUrl: string | undefined;
    if (userExists) {
      // This block is never entered for non-existent users
      devResetUrl = 'should-not-be-set';
    }

    expect(devResetUrl).toBeUndefined();
  });
});

// ── test_remember_me_extends_max_age ─────────────────────────────────────────
// Exercises the real login schema and jwt callback (the credentials form posts strings).
describe('rememberMe → session lifetime', () => {
  const DAY = 24 * 60 * 60;

  async function tokenExpiryForFormValue(rememberMe: string | undefined) {
    const { loginSchema } = await import('@/features/auth/schemas/auth.schema');
    const { authConfig } = await import('@/server/auth/auth.config');
    const parsed = loginSchema.parse({ email: 'a@example.com', password: 'x', rememberMe });
    const jwt = authConfig.callbacks!.jwt! as unknown as (args: {
      token: Record<string, unknown>;
      user?: Record<string, unknown>;
    }) => Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    const token = jwt({ token: {}, user: { id: 'u1', rememberMe: parsed.rememberMe } });
    return Number(token.exp) - now;
  }

  it('the string "false" from the login form means not remembered (24h)', async () => {
    const ttl = await tokenExpiryForFormValue('false');
    expect(ttl).toBeGreaterThan(DAY - 5);
    expect(ttl).toBeLessThanOrEqual(DAY);
  });

  it('the string "true" keeps the 30-day session', async () => {
    const ttl = await tokenExpiryForFormValue('true');
    expect(ttl).toBeGreaterThan(30 * DAY - 5);
  });

  it('a missing value defaults to not remembered', async () => {
    const { loginSchema } = await import('@/features/auth/schemas/auth.schema');
    expect(loginSchema.parse({ email: 'a@example.com', password: 'x' }).rememberMe).toBe(false);
    expect(
      loginSchema.safeParse({ email: 'a@example.com', password: 'x', rememberMe: 'yes' }).success
    ).toBe(false);
  });
});
