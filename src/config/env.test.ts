import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isIndexableDeployment, resolveAuthUrl, resolveSiteUrl } from './env';

describe('resolveAuthUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should prioritize AUTH_URL over NEXTAUTH_URL and NEXT_PUBLIC_APP_URL', () => {
    process.env.AUTH_URL = 'https://auth.example.com';
    process.env.NEXTAUTH_URL = 'https://nextauth.example.com';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';

    expect(resolveAuthUrl()).toBe('https://auth.example.com');
  });

  it('should fall back to NEXTAUTH_URL if AUTH_URL is missing', () => {
    delete process.env.AUTH_URL;
    process.env.NEXTAUTH_URL = 'https://nextauth.example.com/';

    // Also tests stripping trailing slash
    expect(resolveAuthUrl()).toBe('https://nextauth.example.com');
  });

  it('should fall back to NEXT_PUBLIC_APP_URL when AUTH_URL and NEXTAUTH_URL are missing', () => {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://preview.example.com';

    expect(resolveAuthUrl()).toBe('https://preview.example.com');
  });

  it('should treat empty AUTH_URL as unset and use NEXTAUTH_URL', () => {
    process.env.AUTH_URL = '';
    process.env.NEXTAUTH_URL = 'https://app.example.com';

    expect(resolveAuthUrl()).toBe('https://app.example.com');
  });

  it('should not double-prefix VERCEL_URL when scheme is present', () => {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_URL = 'https://preview.example.com';

    expect(resolveAuthUrl()).toBe('https://preview.example.com');
  });

  it('should fall back to VERCEL_URL and add https if scheme is missing', () => {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_URL = 'preview.example.vercel.app';

    expect(resolveAuthUrl()).toBe('https://preview.example.vercel.app');
  });

  it('should use localhost:3000 when missing all variables and not in production', () => {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    Object.assign(process.env, { NODE_ENV: 'development' });

    expect(resolveAuthUrl()).toBe('http://localhost:3000');
  });

  it('should throw an error in production if no variables are provided', () => {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    Object.assign(process.env, { NODE_ENV: 'production' });

    expect(() => resolveAuthUrl()).toThrowError(/Missing required environment variable/);
  });
});

describe('resolveSiteUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SITE_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.AUTH_URL = 'https://auth.example.com';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('prefers an explicit SITE_URL and normalizes it', () => {
    process.env.SITE_URL = 'quizfree.example/';
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'quizfree.vercel.app';

    expect(resolveSiteUrl()).toBe('https://quizfree.example');
  });

  it('uses the Vercel production domain on production, never the per-deployment VERCEL_URL', () => {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_URL = 'quizfree-abc123-team.vercel.app';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'quizfree.example';

    expect(resolveSiteUrl()).toBe('https://quizfree.example');
  });

  it('ignores the production domain outside Vercel production', () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'quizfree.example';

    expect(resolveSiteUrl()).toBe('https://auth.example.com');
  });

  it('falls back to the auth URL', () => {
    expect(resolveSiteUrl()).toBe('https://auth.example.com');
  });
});

describe('isIndexableDeployment', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it.each([
    [undefined, true],
    ['production', true],
    ['preview', false],
    ['development', false],
  ])('VERCEL_ENV=%s → %s', (vercelEnv, expected) => {
    process.env = { ...originalEnv };
    if (vercelEnv) process.env.VERCEL_ENV = vercelEnv;
    else delete process.env.VERCEL_ENV;

    expect(isIndexableDeployment()).toBe(expected);
  });
});

describe('env AI settings', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('importing env does not throw in production when OLLAMA_* is missing', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      AUTH_URL: 'https://app.example.com',
      NEXTAUTH_SECRET: 'secret',
    };
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
    vi.resetModules();

    const { env } = await import('./env');

    expect(env.authUrl).toBe('https://app.example.com');
    // Only the AI feature itself fails, when it reads the setting.
    expect(() => env.ollamaModel).toThrow('OLLAMA_MODEL');
    expect(() => env.ollamaBaseUrl).toThrow('OLLAMA_BASE_URL');
  });
});
