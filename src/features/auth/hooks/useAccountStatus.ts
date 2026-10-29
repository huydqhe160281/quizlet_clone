'use client';

import { useQuery } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { authKeys } from '@/features/auth/query-keys';
import { prepareOfflineDataForSignOut } from '@/features/study-offline/flush-before-signout';
import type { StudyLimitStatus } from '@/features/study/lib/study-limit';

export type AccountStatus = {
  id: string;
  email?: string | null;
  needsEmailVerification: boolean;
  /** Review budget while unverified; null once verified. */
  studyLimit?: StudyLimitStatus | null;
};

export class AccountStatusError extends Error {
  constructor(public status: number) {
    super(`account status ${status}`);
    this.name = 'AccountStatusError';
  }
}

export async function fetchAccountStatus(): Promise<AccountStatus> {
  const response = await fetch('/api/v1/auth/me', { cache: 'no-store' });
  if (!response.ok) throw new AccountStatusError(response.status);
  const payload = (await response.json()) as { data: AccountStatus };
  return payload.data;
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof AccountStatusError && error.status === 401;
}

/**
 * Server-side view of the signed-in account. Middleware cannot see a revoked session
 * (it has no DB access), so a 401 here means the session was revoked (e.g. by a
 * password reset elsewhere) and we sign out to clear the stale cookie.
 */
export function useAccountStatus(userId: string | undefined) {
  const query = useQuery({
    queryKey: authKeys.me(),
    queryFn: fetchAccountStatus,
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 2,
  });

  const revoked = isUnauthorized(query.error);

  useEffect(() => {
    if (!revoked) return;
    void (async () => {
      await prepareOfflineDataForSignOut(userId).catch(() => {});
      await signOut({ callbackUrl: '/login' });
    })();
  }, [revoked, userId]);

  return query;
}
