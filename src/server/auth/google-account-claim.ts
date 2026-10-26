import { env } from '@/config/env';
import { prisma } from '@/server/db';
import { resolveEmailLocale, sendAccountClaimedEmail } from '@/server/auth/email';
import { emailVerificationIdentifier } from '@/server/auth/email-verification';
import { forgetSessionVersion } from '@/server/auth/session-version';

type SignInAccount = { provider: string; providerAccountId: string } | null | undefined;
type SignInProfile = { email?: string | null; email_verified?: unknown } | null | undefined;

/** Where a refused Google sign-in lands; LoginForm maps the code to a message. */
export const GOOGLE_EMAIL_UNVERIFIED_REDIRECT = '/login?error=GoogleEmailUnverified';

/**
 * Google sign-in for an address that already has a password account. Google links to the
 * existing user (allowDangerousEmailAccountLinking), which is only safe because:
 * - Google must report the address as verified, otherwise sign-in is refused;
 * - an existing account that never confirmed the address may belong to someone who
 *   typed another person's email. The Google user proves ownership, so they take the
 *   account over: the password and pending email tokens are dropped, every existing
 *   session is revoked, and the address is told how to set a password again.
 * A verified password account simply gains Google as a second sign-in method.
 *
 * Runs in the signIn callback, before Auth.js loads the user to link, so the session it
 * issues already carries the bumped session version. Doing it after linking instead
 * would risk the reverse failure: a linked Google owner sharing the account with a
 * squatter whose password survived. If linking fails after the takeover, signing in
 * with Google again completes it (the account then has no password to claim).
 *
 * Returns true to continue, or a redirect URL to refuse the sign-in.
 */
export async function prepareGoogleSignIn(
  account: SignInAccount,
  profile: SignInProfile
): Promise<true | string> {
  if (account?.provider !== 'google') return true;
  if (profile?.email_verified !== true || !profile.email) {
    return GOOGLE_EMAIL_UNVERIFIED_REDIRECT;
  }

  const linked = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    select: { userId: true },
  });
  if (linked) return true;

  // The Google provider lowercases the profile email too (auth.ts), so the adapter's
  // own lookup finds this same row.
  const email = profile.email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, emailVerified: true, preferredLocale: true },
  });
  if (!existing?.passwordHash || existing.emailVerified) return true;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: null,
        emailVerified: new Date(),
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: { in: [email, emailVerificationIdentifier(email)] } },
    }),
  ]);
  forgetSessionVersion(existing.id);

  try {
    await sendAccountClaimedEmail(
      email,
      `${env.authUrl}/forgot-password`,
      resolveEmailLocale(existing.preferredLocale)
    );
  } catch (error) {
    // The takeover already happened; a failed notice must not block the owner's sign-in.
    console.error('[auth] failed to send account claimed email', error);
  }
  return true;
}

/** New Google users are created with `emailVerified: null`; Google already checked it. */
export async function markGoogleEmailVerified(
  userId: string | undefined,
  account: SignInAccount
): Promise<void> {
  if (!userId || account?.provider !== 'google') return;
  await prisma.user.updateMany({
    where: { id: userId, emailVerified: null },
    data: { emailVerified: new Date() },
  });
}
