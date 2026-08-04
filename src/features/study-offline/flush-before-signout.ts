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
