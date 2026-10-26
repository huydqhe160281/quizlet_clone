import { ApiError } from '@/lib/api-error';
import { prisma } from '@/server/db';

/**
 * Verification policy. Only password sign-ups confirm by email; an OAuth-only account
 * (no password) counts as verified because the provider (Google) vouched for the address.
 * Unverified accounts can sign in and study, but cannot publish sets and get a smaller
 * AI generation quota.
 */
export function isEmailConsideredVerified(user: {
  emailVerified: Date | null;
  passwordHash: string | null;
}): boolean {
  return user.emailVerified !== null || user.passwordHash === null;
}

export async function hasVerifiedEmail(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, passwordHash: true },
  });
  return user !== null && isEmailConsideredVerified(user);
}

/** Publishing exposes the set to everyone, so it needs a confirmed owner address. */
export async function assertCanPublish(userId: string): Promise<void> {
  if (!(await hasVerifiedEmail(userId))) {
    throw new ApiError('EMAIL_NOT_VERIFIED', 'Verify your email before making a set public', 403);
  }
}
