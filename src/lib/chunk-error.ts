/**
 * After a deploy, a tab still running the old build asks for JS chunks that no longer
 * exist. Reloading picks up the new build; the session flag stops a reload loop when
 * the failure has another cause.
 */
const RELOAD_FLAG = 'chunk-error-reloaded-at';
const RELOAD_WINDOW_MS = 60_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'ChunkLoadError' ||
    /Loading (CSS )?chunk [\w-]+ failed/i.test(error.message) ||
    /Failed to fetch dynamically imported module/i.test(error.message)
  );
}

type ReloadDeps = {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  reload?: () => void;
  now?: number;
};

/** Reloads once for a chunk error; returns true when a reload was started. */
export function reloadOnceForChunkError(error: unknown, deps: ReloadDeps = {}): boolean {
  if (!isChunkLoadError(error)) return false;
  const now = deps.now ?? Date.now();
  let storage = deps.storage;
  if (storage === undefined) {
    try {
      storage = window.sessionStorage;
    } catch {
      storage = null;
    }
  }

  try {
    const last = storage?.getItem(RELOAD_FLAG);
    if (last != null && now - Number(last) < RELOAD_WINDOW_MS) return false;
    storage?.setItem(RELOAD_FLAG, String(now));
  } catch {
    // Without storage we cannot detect a loop, so do not risk reloading forever.
    return false;
  }

  (deps.reload ?? (() => window.location.reload()))();
  return true;
}
