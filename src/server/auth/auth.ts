import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { loginSchema } from '@/features/auth/schemas/auth.schema';
import { env } from '@/config/env';
import { authConfig } from '@/server/auth/auth.config';
import { prisma } from '@/server/db';
import { verifyPassword } from '@/server/auth/password';
import { applySessionVersion } from '@/server/auth/session-version';

const googleProvider =
  env.googleClientId && env.googleClientSecret
    ? [
        Google({
          clientId: env.googleClientId,
          clientSecret: env.googleClientSecret,
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  secret: env.authSecret,
  callbacks: {
    ...authConfig.callbacks,
    // Node-only: the edge config (middleware) cannot reach the DB, so revocation is checked here.
    async jwt(params) {
      const token = await authConfig.callbacks!.jwt!(params);
      return token ? applySessionVersion(token, params.user) : token;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      try {
        const { cookies, headers } = await import('next/headers');
        const { planLoginLocaleSync } = await import('@/lib/auth/login-sync');
        const { APP_LOCALE_COOKIE } = await import('@/lib/i18n/constants');
        const { setLocaleCookie } = await import('@/lib/i18n/cookies');

        const jar = await cookies();
        const headerStore = await headers();
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { preferredLocale: true },
        });
        const plan = planLoginLocaleSync({
          dbLocale: dbUser?.preferredLocale ?? null,
          cookieLocale: jar.get(APP_LOCALE_COOKIE)?.value,
          acceptLanguage: headerStore.get('accept-language'),
        });

        if (plan.persistToDb) {
          await prisma.user.update({
            where: { id: user.id },
            data: { preferredLocale: plan.locale },
          });
        }
        await setLocaleCookie(plan.locale);
      } catch {
        // Login must not fail if locale sync cannot run (e.g. outside request scope).
      }
    },
  },
  providers: [
    ...googleProvider,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember me', type: 'text' },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          sessionVersion: user.sessionVersion,
          // Pass rememberMe so jwt callback can set dynamic maxAge
          rememberMe: parsed.data.rememberMe ?? false,
        };
      },
    }),
  ],
});
