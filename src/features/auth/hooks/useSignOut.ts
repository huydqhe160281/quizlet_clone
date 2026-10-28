'use client';

import { signOut, useSession } from 'next-auth/react';
import { removeDevicePushSubscription } from '@/features/settings/lib/push-subscription';
import { prepareOfflineDataForSignOut } from '@/features/study-offline/flush-before-signout';

/**
 * Flushes queued offline study answers for this user and stops this device's study reminders
 * (so the next account on a shared device does not get them), then signs out.
 */
export function useSignOut() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return async (callbackUrl = '/') => {
    await prepareOfflineDataForSignOut(userId).catch(() => {});
    await removeDevicePushSubscription().catch(() => {});
    await signOut({ callbackUrl });
  };
}
