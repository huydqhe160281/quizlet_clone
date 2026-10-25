import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/server/auth/auth.config';
import { APP_LOCALE_COOKIE } from '@/lib/i18n/constants';
import { planRequestLocale } from '@/lib/i18n/middleware-locale';
import { env } from '@/config/env';

const { auth } = NextAuth(authConfig);

const protectedPrefixes = [
  '/dashboard',
  '/today',
  '/sets',
  '/study',
  '/folders',
  '/search',
  '/settings',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  // Require a real user: on auth misconfiguration next-auth can populate req.auth
  // with an error object instead of null, so a bare truthiness check fails open.
  const isSignedIn = Boolean(req.auth?.user?.id);
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !isSignedIn) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(loginUrl);
  }

  const isAuthPageOrRoot = pathname === '/' || pathname === '/login' || pathname === '/register';
  if (isAuthPageOrRoot && isSignedIn) {
    const dashboardUrl = new URL('/dashboard', req.nextUrl.origin);
    return Response.redirect(dashboardUrl);
  }

  // Cookie is kept in sync with DB via login-sync + preference PATCH (ADR-002).
  const plan = planRequestLocale({
    cookieLocale: req.cookies.get(APP_LOCALE_COOKIE)?.value,
    acceptLanguage: req.headers.get('accept-language'),
  });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(plan.headerName, plan.locale);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (plan.refreshCookie) {
    response.cookies.set(plan.cookieName, plan.locale, {
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
      secure: env.nodeEnv === 'production',
      maxAge: plan.cookieMaxAge,
    });
  }

  return response;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|forgot-password|reset-password).*)'],
};
