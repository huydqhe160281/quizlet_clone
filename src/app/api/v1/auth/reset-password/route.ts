import { ApiError, withErrorHandler } from '@/lib/api-error';
import { resetPasswordSchema } from '@/features/auth/schemas/auth.schema';
import { prisma } from '@/server/db';
import { hashPassword, hashResetToken, isResetTokenExpired } from '@/server/auth/password';
import { isEmailVerificationIdentifier } from '@/server/auth/email-verification';
import { forgetSessionVersion } from '@/server/auth/session-version';

export const POST = withErrorHandler(async (req) => {
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
  }

  // Only hashed tokens are stored; looking up the raw value would let a leaked hash work.
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashResetToken(parsed.data.token) },
  });

  // Email-verification tokens share the table and must not reset passwords.
  if (!record || isEmailVerificationIdentifier(record.identifier)) {
    throw new ApiError('TOKEN_INVALID', 'Invalid or expired token', 400);
  }

  if (isResetTokenExpired(record.expires)) {
    await prisma.verificationToken.delete({ where: { token: record.token } });
    throw new ApiError('TOKEN_EXPIRED', 'Reset token has expired', 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);
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

  return Response.json({ data: { message: 'Password updated successfully' } });
});
