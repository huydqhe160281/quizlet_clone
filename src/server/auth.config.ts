import type { NextAuthConfig } from 'next-auth';
import { env } from '@/lib/env';

const SESSION_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60; // 30 days
const SESSION_MAX_AGE_DEFAULT = 24 * 60 * 60; // 24 hours

export const authConfig: NextAuthConfig = {
  secret: env.authSecret,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_REMEMBER, // upper bound; overridden per-token below
  },
  cookies: {
    sessionToken: {
      name: env.nodeEnv === 'production' ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: env.nodeEnv === 'production', // use typed env, not raw process.env
        maxAge: SESSION_MAX_AGE_REMEMBER,
      },
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;

        const rememberMe =
          'rememberMe' in user && (user as { rememberMe?: boolean }).rememberMe === true;
        token.rememberMe = rememberMe;
      }

      // Calculate exp dynamically on every callback invocation to support sliding window rotation
      const rememberMe = token.rememberMe === true;
      const maxAge = rememberMe ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT;
      token.exp = Math.floor(Date.now() / 1000) + maxAge;

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  providers: [],
  trustHost: true,
};
