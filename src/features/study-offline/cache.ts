import { getStudyOfflineDb } from '@/features/study-offline/db';
import type { CachedSetEntry, OfflineStudyCard } from '@/features/study-offline/types';

const MAX_CACHED_SETS_PER_USER = 5;

function logCacheError(action: string, error: unknown) {
  console.error(`[study-offline/cache] ${action} failed`, error);
}

/** Upserts a set snapshot for offline resume; LRU-evicts beyond 5 entries per user. */
export async function upsertCachedSet(
  userId: string,
  setId: string,
  sessionId: string,
  setTitle: string,
  cards: OfflineStudyCard[]
): Promise<void> {
  try {
    const db = await getStudyOfflineDb();
    const now = Date.now();
    const entry: CachedSetEntry = {
      setId,
      userId,
      sessionId,
      setTitle,
      cards,
      cachedAt: now,
      lastAccessedAt: now,
    };
    await db.put('sets', entry);

    const userSets = await db.getAllFromIndex('sets', 'by-userId', userId);
    if (userSets.length <= MAX_CACHED_SETS_PER_USER) return;

    const sorted = [...userSets].sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
    const overflow = sorted.slice(0, userSets.length - MAX_CACHED_SETS_PER_USER);
    await Promise.all(overflow.map((row) => db.delete('sets', [row.setId, row.userId])));
  } catch (error) {
    logCacheError('upsertCachedSet', error);
  }
}

/** Returns a cached set for this user, refreshing LRU recency on hit. */
export async function getCachedSet(
  userId: string,
  setId: string
): Promise<CachedSetEntry | undefined> {
  try {
    const db = await getStudyOfflineDb();
    const entry = await db.get('sets', [setId, userId]);
    if (!entry) return undefined;

    const updated: CachedSetEntry = { ...entry, lastAccessedAt: Date.now() };
    await db.put('sets', updated);
    return updated;
  } catch (error) {
    logCacheError('getCachedSet', error);
    return undefined;
  }
}

/** Deletes all content-cache rows for one user (mutations are left intact). */
export async function clearCachedSetsForUser(userId: string): Promise<void> {
  try {
    const db = await getStudyOfflineDb();
    const rows = await db.getAllFromIndex('sets', 'by-userId', userId);
    await Promise.all(rows.map((row) => db.delete('sets', [row.setId, row.userId])));
  } catch (error) {
    logCacheError('clearCachedSetsForUser', error);
  }
}

/** Removes sets belonging to any user other than `currentUserId`. */
export async function purgeForeignCachedSets(currentUserId: string): Promise<void> {
  try {
    const db = await getStudyOfflineDb();
    const all = await db.getAll('sets');
    const foreign = all.filter((row) => row.userId !== currentUserId);
    await Promise.all(foreign.map((row) => db.delete('sets', [row.setId, row.userId])));
  } catch (error) {
    logCacheError('purgeForeignCachedSets', error);
  }
}
