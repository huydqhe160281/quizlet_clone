import { auth } from '@/server/auth/auth';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { prisma } from '@/server/db';

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
      // Only password sign-ups are asked to confirm; OAuth providers vouch for the address.
      needsEmailVerification: Boolean(user?.passwordHash) && !user?.emailVerified,
    },
  });
});
