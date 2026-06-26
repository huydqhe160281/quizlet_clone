import { ApiError, withErrorHandler } from '@/lib/api-error';
import { resetPasswordSchema } from '@/features/auth/schemas/auth.schema';
import { prisma } from '@/server/db';
import { hashPassword, isResetTokenExpired } from '@/server/auth/password';

export const POST = withErrorHandler(async (req) => {
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token: parsed.data.token },
  });

  if (!record) {
    throw new ApiError('TOKEN_INVALID', 'Invalid or expired token', 400);
  }

  if (isResetTokenExpired(record.expires)) {
    await prisma.verificationToken.delete({ where: { token: parsed.data.token } });
    throw new ApiError('TOKEN_EXPIRED', 'Reset token has expired', 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.identifier },
      data: { passwordHash },
    }),
    prisma.verificationToken.delete({ where: { token: parsed.data.token } }),
  ]);

  return Response.json({ data: { message: 'Password updated successfully' } });
});
