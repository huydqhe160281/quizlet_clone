import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type AuthedRequest = NextRequest & { auth: unknown };
type Handler = (req: AuthedRequest) => Response;

// NextAuth(config).auth(handler) → the handler itself, so tests can set req.auth.
vi.mock('next-auth', () => ({
  default: () => ({ auth: (handler: Handler) => handler }),
}));

import middleware from '@/middleware';

function run(path: string, auth: unknown): Response {
  const req = new NextRequest(`http://localhost:3000${path}`) as AuthedRequest;
  req.auth = auth;
  return (middleware as unknown as Handler)(req);
}

describe('middleware route protection', () => {
  it('redirects anonymous users away from protected pages', () => {
    const res = run('/dashboard', null);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/login?callbackUrl=%2Fdashboard'
    );
  });

  it('fails closed when req.auth is an error object without a user', () => {
    const res = run('/sets/abc', { message: 'Server configuration error' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('fails closed when the session has no user id', () => {
    const res = run('/today', { user: {} });
    expect(res.status).toBe(302);
  });

  it('lets signed-in users through to protected pages', () => {
    const res = run('/dashboard', { user: { id: 'user-a' } });
    expect(res.headers.get('location')).toBeNull();
  });

  it('sends signed-in users from /login to the dashboard', () => {
    const res = run('/login', { user: { id: 'user-a' } });
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('does not treat an error object as signed in on /login', () => {
    const res = run('/login', { message: 'Server configuration error' });
    expect(res.headers.get('location')).toBeNull();
  });
});
