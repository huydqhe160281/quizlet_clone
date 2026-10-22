import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/v1/auth/session-expired', () => {
  it('expires every session cookie chunk and redirects to /login', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/session-expired', {
      headers: {
        cookie:
          'authjs.session-token.0=a; authjs.session-token.1=b; app-locale=vi; __Secure-authjs.session-token=c',
      },
    });

    const res = await GET(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
    const setCookies = res.headers.getSetCookie();
    expect(setCookies).toHaveLength(3);
    expect(setCookies.every((cookie) => /Max-Age=0/i.test(cookie))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith('app-locale'))).toBe(false);
    expect(setCookies.find((cookie) => cookie.startsWith('__Secure-'))).toMatch(/Secure/);
  });
});
