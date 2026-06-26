import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { loginSchema } from '@/features/auth/schemas/auth.schema';
import { env } from '@/config/env';
import { authConfig } from '@/server/auth/auth.config';
import { prisma } from '@/server/db';
import { verifyPassword } from '@/server/auth/password';

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
          // Pass rememberMe so jwt callback can set dynamic maxAge
          rememberMe: parsed.data.rememberMe ?? false,
        };
      },
    }),
  ],
});
