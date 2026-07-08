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

const utcDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

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

  const entry: StreakCacheEntry = { ...snapshot, date: utcDateKey() };
  localStorage.setItem(storageKey(userId), JSON.stringify(entry));
}

export function isStreakCacheFresh(
  userId: string,
  cache: StreakCacheEntry | null
): cache is StreakCacheEntry {
  return cache !== null && cache.date === utcDateKey();
}

export function notifyStreakUpdated(detail: StreakUpdatedDetail): void {
  if (typeof window === 'undefined' || !detail.changed) {
    return;
  }

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
