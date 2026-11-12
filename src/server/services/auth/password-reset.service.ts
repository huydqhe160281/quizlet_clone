import { randomBytes } from 'crypto';
import { ApiError } from '@/lib/api-error';
import { env } from '@/config/env';
import { prisma } from '@/server/db';
import { hashPassword, hashResetToken, isResetTokenExpired } from '@/server/auth/password';
import { isEmailVerificationIdentifier } from '@/server/auth/email-verification';
import { forgetSessionVersion } from '@/server/auth/session-version';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Account lookup for a reset request; null when the address is unknown. */
export function findPasswordResetUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, preferredLocale: true },
  });
}

/** Replaces any earlier token for `email` and returns the reset link to send. */
export async function issuePasswordResetUrl(email: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  // Only the hash is stored, so a leaked table row is not a usable token.
  await prisma.verificationToken.create({
    data: { identifier: email, token: hashResetToken(token), expires },
  });
  return `${env.authUrl}/reset-password?token=${token}`;
}

/** Consumes a reset token: sets the new password and signs out every existing session. */
export async function resetPasswordWithToken(token: string, password: string): Promise<void> {
  // Only hashed tokens are stored; looking up the raw value would let a leaked hash work.
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashResetToken(token) },
  });

  // Email-verification tokens share the table and must not reset passwords.
  if (!record || isEmailVerificationIdentifier(record.identifier)) {
    throw new ApiError('TOKEN_INVALID', 'Invalid or expired token', 400);
  }

  if (isResetTokenExpired(record.expires)) {
    await prisma.verificationToken.delete({ where: { token: record.token } });
    throw new ApiError('TOKEN_EXPIRED', 'Reset token has expired', 400);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
    select: { id: true, emailVerified: true },
  });
  if (!user) {
    await prisma.verificationToken.delete({ where: { token: record.token } });
    throw new ApiError('TOKEN_INVALID', 'Invalid or expired token', 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        // Bumping the version signs out every existing session (see session-version.ts).
        sessionVersion: { increment: 1 },
        // Using the emailed link proves ownership of the address.
        ...(user.emailVerified ? {} : { emailVerified: new Date() }),
      },
    }),
    prisma.verificationToken.delete({ where: { token: record.token } }),
  ]);
  forgetSessionVersion(user.id);
}
