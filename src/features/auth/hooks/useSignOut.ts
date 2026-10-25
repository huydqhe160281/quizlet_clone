'use client';

import { signOut, useSession } from 'next-auth/react';
import { prepareOfflineDataForSignOut } from '@/features/study-offline/flush-before-signout';

/** Flushes queued offline study answers for this user, then signs out. */
export function useSignOut() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return async (callbackUrl = '/') => {
    await prepareOfflineDataForSignOut(userId).catch(() => {});
    await signOut({ callbackUrl });
  };
}
