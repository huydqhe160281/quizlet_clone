import { ApiError } from '@/lib/api-error';
import type { ChangePasswordInput } from '@/features/auth/schemas/auth.schema';
import type { AccountSummary } from '@/features/settings/types';
import { prisma } from '@/server/db';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { isEmailConsideredVerified } from '@/server/auth/email-verified';
import { forgetSessionVersion } from '@/server/auth/session-version';

export async function getAccountSummary(userId: string): Promise<AccountSummary | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, emailVerified: true, passwordHash: true },
  });
  if (!user) return null;
  return {
    name: user.name,
    email: user.email,
    emailVerified: isEmailConsideredVerified(user),
    hasPassword: user.passwordHash !== null,
  };
}

/**
 * Replaces the password after checking the current one. Bumping the session version
 * signs out every session, this one included, so the client sends the user to sign in.
 */
export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    throw new ApiError('PASSWORD_NOT_SET', 'This account signs in without a password', 400);
  }
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new ApiError('INVALID_PASSWORD', 'Current password is incorrect', 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(input.newPassword),
      sessionVersion: { increment: 1 },
    },
  });
  forgetSessionVersion(userId);
}
