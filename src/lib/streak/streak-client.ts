export type StreakSnapshot = {
  currentStreak: number;
  longestStreak: number;
};

type StreakCacheEntry = StreakSnapshot & {
  date: string;
};

export type StreakUpdatedDetail = StreakSnapshot & {
  changed: boolean;
};

export const STREAK_UPDATED_EVENT = 'study-streak-updated';

const storageKey = (userId: string) => `quizlet-clone-streak:${userId}`;

// Local calendar date (YYYY-MM-DD), matching the server's per-time-zone streak day.
const localDateKey = (date = new Date()) => date.toLocaleDateString('en-CA');

export function readStreakCache(userId: string): StreakCacheEntry | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StreakCacheEntry;
  } catch {
    return null;
  }
}

export function writeStreakCache(userId: string, snapshot: StreakSnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  const entry: StreakCacheEntry = { ...snapshot, date: localDateKey() };
  localStorage.setItem(storageKey(userId), JSON.stringify(entry));
}

export function isStreakCacheFresh(
  userId: string,
  cache: StreakCacheEntry | null
): cache is StreakCacheEntry {
  return cache !== null && cache.date === localDateKey();
}

export function notifyStreakUpdated(detail: StreakUpdatedDetail): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Always broadcast authoritative server snapshots so UI can recover from a
  // stale localStorage "0" cache even when `changed` is false (already studied today).
  window.dispatchEvent(new CustomEvent(STREAK_UPDATED_EVENT, { detail }));
}

export async function fetchStreakSnapshot(userId: string): Promise<StreakSnapshot> {
  const response = await fetch('/api/v1/user/streak');
  if (!response.ok) {
    throw new Error('Failed to load streak');
  }

  const { data } = (await response.json()) as { data: StreakSnapshot };
  writeStreakCache(userId, data);
  return data;
}

const timeZoneSyncKey = (userId: string) => `quizlet-clone-tz-sync:${userId}`;

function detectTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Send the browser time zone once per user/zone. The server only applies it while the
 * stored zone is still the UTC default. Resolves true when a sync request was made.
 */
export async function syncDetectedTimeZone(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }
  const timeZone = detectTimeZone();
  if (!timeZone || timeZone === 'UTC' || timeZone === 'Etc/UTC') {
    return false;
  }
  try {
    if (localStorage.getItem(timeZoneSyncKey(userId)) === timeZone) {
      return false;
    }
  } catch {
    // Storage blocked: still sync; the server makes repeats harmless.
  }

  const response = await fetch('/api/v1/user/timezone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeZone }),
  });
  if (!response.ok) {
    return false;
  }
  try {
    localStorage.setItem(timeZoneSyncKey(userId), timeZone);
  } catch {
    // ignore
  }
  return true;
}
