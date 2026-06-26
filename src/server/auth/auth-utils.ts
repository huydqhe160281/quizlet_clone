import { auth } from '@/server/auth/auth';
import { ApiError } from '@/lib/api-error';

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError('UNAUTHORIZED', 'Not authenticated', 401);
  }
  return session.user.id;
}
