import { cache } from 'react';
import { auth } from '@/server/auth/auth';
import { ApiError } from '@/lib/api-error';

/**
 * Request-scoped session lookup. Layouts and pages of one server render share a single
 * JWT decode and session-version check instead of repeating it per call.
 */
export const getServerSession = cache(() => auth());

export async function requireUserId(): Promise<string> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new ApiError('UNAUTHORIZED', 'Not authenticated', 401);
  }
  return session.user.id;
}

/** Returns user id when signed in; otherwise null (no throw). */
export async function optionalUserId(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.id ?? null;
}
