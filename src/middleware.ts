import NextAuth from 'next-auth';
import { authConfig } from '@/server/auth/auth.config';

const { auth } = NextAuth(authConfig);

const protectedPrefixes = ['/dashboard', '/sets', '/study', '/folders', '/search'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(loginUrl);
  }

  const isAuthPageOrRoot = pathname === '/' || pathname === '/login' || pathname === '/register';
  if (isAuthPageOrRoot && req.auth) {
    const dashboardUrl = new URL('/dashboard', req.nextUrl.origin);
    return Response.redirect(dashboardUrl);
  }

  return undefined;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|forgot-password|reset-password).*)'],
};
