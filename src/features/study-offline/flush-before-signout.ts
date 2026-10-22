import { clearCachedSetsForUser } from '@/features/study-offline/cache';
import { replayPendingMutations } from '@/features/study-offline/replay';

const FLUSH_TIMEOUT_MS = 5_000;

/**
 * Best-effort, bounded one-shot replay before sign-out.
 * Errors and timeouts are swallowed so sign-out always proceeds.
 */
export async function flushPendingMutationsBeforeSignOut(
  userId: string | undefined
): Promise<void> {
  if (!userId) return;

  await Promise.race([
    replayPendingMutations(userId).then(
      () => undefined,
      () => undefined
    ),
    new Promise<void>((resolve) => {
      setTimeout(resolve, FLUSH_TIMEOUT_MS);
    }),
  ]);
}

/**
 * Sign-out preparation: flush the queue, then delete this user's cached card content.
 * Must run before `signOut()`: its full-page redirect means the provider never sees an
 * `unauthenticated` status in this tab, so its own cleanup would not run.
 */
export async function prepareOfflineDataForSignOut(userId: string | undefined): Promise<void> {
  if (!userId) return;
  await flushPendingMutationsBeforeSignOut(userId);
  await clearCachedSetsForUser(userId).catch(() => undefined);
}
