import type { StudySessionSettings } from '@/features/study/schemas/study.schema';
import type { StreakUpdatedDetail } from '@/lib/streak/streak-client';

type SessionCardResponse = {
  id: string;
  cardId: string;
  card: {
    front: string;
    back: string;
    example: string | null;
    imageUrl: string | null;
  };
};

export type CreatedStudySession = {
  id: string;
  settings?: unknown;
  sessionCards: SessionCardResponse[];
};

export type CreateSessionResult = {
  data: CreatedStudySession;
  streak?: StreakUpdatedDetail;
};

type CacheEntry =
  | { kind: 'pending'; promise: Promise<CreateSessionResult> }
  | { kind: 'ready'; result: CreateSessionResult; expiresAt: number };

/** Dedupes Strict Mode remounts / double-clicks that would POST twice. */
const createCache = new Map<string, CacheEntry>();
const CREATE_CACHE_TTL_MS = 15_000;

function cacheKey(setId: string, mode: string, settings?: StudySessionSettings) {
  return `${setId}|${mode}|${JSON.stringify(settings ?? null)}`;
}

/**
 * Creates a study session once per set+mode+settings within a short TTL.
 * Concurrent callers (e.g. React Strict Mode double-mount) share one POST.
 */
export async function createStudySessionOnce(
  setId: string,
  mode: string,
  settings?: StudySessionSettings
): Promise<CreateSessionResult> {
  const key = cacheKey(setId, mode, settings);
  const now = Date.now();
  const hit = createCache.get(key);

  if (hit?.kind === 'pending') {
    return hit.promise;
  }
  if (hit?.kind === 'ready' && hit.expiresAt > now) {
    return hit.result;
  }

  const promise = (async (): Promise<CreateSessionResult> => {
    const response = await fetch('/api/v1/study/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId, mode, ...(settings ? { settings } : {}) }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      throw new Error(payload.message ?? 'Failed to start session');
    }

    const result = (await response.json()) as CreateSessionResult;
    createCache.set(key, {
      kind: 'ready',
      result,
      expiresAt: Date.now() + CREATE_CACHE_TTL_MS,
    });
    return result;
  })().catch((error: unknown) => {
    createCache.delete(key);
    throw error;
  });

  createCache.set(key, { kind: 'pending', promise });
  return promise;
}

/** Test helper — clears in-flight / TTL cache between cases. */
export function clearCreateSessionCache() {
  createCache.clear();
}
