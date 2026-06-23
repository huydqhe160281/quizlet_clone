import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveAuthUrl } from '../env';

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
    process.env.NODE_ENV = 'development';

    expect(resolveAuthUrl()).toBe('http://localhost:3000');
  });

  it('should throw an error in production if no variables are provided', () => {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    process.env.NODE_ENV = 'production';

    expect(() => resolveAuthUrl()).toThrowError(/Missing required environment variable/);
  });
});
