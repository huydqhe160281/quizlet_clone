import { auth } from '@/server/auth/auth';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { prisma } from '@/server/db';
import { isEmailConsideredVerified } from '@/server/auth/email-verified';

export const GET = withErrorHandler(async () => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, passwordHash: true },
  });

  return Response.json({
    data: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      needsEmailVerification: user ? !isEmailConsideredVerified(user) : false,
    },
  });
});
