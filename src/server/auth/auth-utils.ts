import { auth } from '@/server/auth/auth';
import { ApiError } from '@/lib/api-error';

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError('UNAUTHORIZED', 'Not authenticated', 401);
  }
  return session.user.id;
}

/** Returns user id when signed in; otherwise null (no throw). */
export async function optionalUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
