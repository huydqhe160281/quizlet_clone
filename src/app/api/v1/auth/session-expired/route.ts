import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api-error';

const SESSION_COOKIE_PREFIXES = ['authjs.session-token', '__Secure-authjs.session-token'];

/**
 * Clears a session cookie that middleware still accepts but the server has revoked
 * (see session-version.ts), then sends the user to sign in. Server components cannot
 * write cookies, so the (app) layout redirects here instead of rendering a 401.
 */
export const GET = withErrorHandler(async (req) => {
  const response = NextResponse.redirect(new URL('/login', req.url));
  const cookieHeader = req.headers.get('cookie') ?? '';

  for (const part of cookieHeader.split(';')) {
    const name = part.split('=')[0]?.trim();
    // Chunked tokens are stored as `<name>.0`, `<name>.1`, …
    if (!name || !SESSION_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: name.startsWith('__Secure-'),
    });
  }

  return response;
});
