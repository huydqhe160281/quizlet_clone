import { auth } from '@/server/auth/auth';
import { ApiError } from '@/lib/api-error';
import { prisma } from '@/server/db';

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new ApiError('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    throw new ApiError('UNAUTHORIZED', 'Session expired, please sign in again', 401);
  }

  return userId;
}

/** Returns user id when signed in; otherwise null (no throw). */
export async function optionalUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
