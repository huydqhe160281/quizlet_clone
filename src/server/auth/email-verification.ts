import { randomBytes } from 'crypto';
import { env } from '@/config/env';
import type { Locale } from '@/lib/i18n/constants';
import { prisma } from '@/server/db';
import { sendEmailVerificationEmail } from '@/server/auth/email';
import { hashResetToken, isResetTokenExpired } from '@/server/auth/password';

/**
 * Email verification for credentials sign-up. Verification is not required to sign in;
 * it only sets `User.emailVerified`. Tokens live in `verification_tokens` next to the
 * password-reset tokens, so their identifier carries a prefix that keeps the two apart.
 */

const IDENTIFIER_PREFIX = 'verify-email:';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function emailVerificationIdentifier(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`;
}

export function isEmailVerificationIdentifier(identifier: string): boolean {
  return identifier.startsWith(IDENTIFIER_PREFIX);
}

/** Issues a fresh token (replacing older ones) and emails the link (logged in dev). */
export async function issueEmailVerification(email: string, locale: Locale): Promise<void> {
  const identifier = emailVerificationIdentifier(email);
  const token = randomBytes(32).toString('hex');

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: {
        identifier,
        token: hashResetToken(token),
        expires: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
  ]);

  await sendEmailVerificationEmail(email, `${env.authUrl}/verify-email?token=${token}`, locale);
}

export type VerifyEmailResult = 'verified' | 'invalid' | 'expired';

export async function verifyEmailToken(rawToken: string): Promise<VerifyEmailResult> {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashResetToken(rawToken) },
  });
  if (!record || !isEmailVerificationIdentifier(record.identifier)) return 'invalid';

  if (isResetTokenExpired(record.expires)) {
    await prisma.verificationToken.delete({ where: { token: record.token } });
    return 'expired';
  }

  const email = record.identifier.slice(IDENTIFIER_PREFIX.length);
  await prisma.$transaction([
    prisma.user.updateMany({
      where: { email, emailVerified: null },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token: record.token } }),
  ]);
  return 'verified';
}
