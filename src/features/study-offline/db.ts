import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CachedSetEntry, QueuedMutation } from '@/features/study-offline/types';

const DB_NAME = 'quizfree-study-offline';
const DB_VERSION = 1;

export type { CachedSetEntry, QueuedMutation };

interface StudyOfflineDb extends DBSchema {
  sets: {
    key: [string, string];
    value: CachedSetEntry;
    indexes: {
      'by-userId': string;
      'by-lastAccessedAt': number;
    };
  };
  mutations: {
    key: number;
    value: QueuedMutation;
    indexes: {
      'by-userId': string;
      'by-clientTimestamp': number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<StudyOfflineDb>> | null = null;

function forgetConnection(db?: IDBPDatabase<StudyOfflineDb>) {
  db?.close();
  dbPromise = null;
}

/**
 * Opens (or reuses) the offline study IndexedDB connection. A failed or lost connection
 * is never cached, so the next call opens a fresh one instead of failing forever.
 */
export function getStudyOfflineDb(): Promise<IDBPDatabase<StudyOfflineDb>> {
  if (!dbPromise) {
    let opening: Promise<IDBPDatabase<StudyOfflineDb>>;
    try {
      opening = open();
    } catch (error) {
      // indexedDB.open can throw synchronously (e.g. SecurityError in private modes).
      return Promise.reject(error);
    }
    dbPromise = opening;
    opening.catch(() => {
      if (dbPromise === opening) dbPromise = null;
    });
  }
  return dbPromise;
}

function open(): Promise<IDBPDatabase<StudyOfflineDb>> {
  const opening = openDB<StudyOfflineDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sets')) {
        const sets = db.createObjectStore('sets', { keyPath: ['setId', 'userId'] });
        sets.createIndex('by-userId', 'userId');
        sets.createIndex('by-lastAccessedAt', 'lastAccessedAt');
      }
      if (!db.objectStoreNames.contains('mutations')) {
        const mutations = db.createObjectStore('mutations', {
          keyPath: 'localId',
          autoIncrement: true,
        });
        mutations.createIndex('by-userId', 'userId');
        mutations.createIndex('by-clientTimestamp', 'clientTimestamp');
      }
    },
    // Another tab still holds an older version open; it is asked to close (blocking
    // below), so this open simply waits. Log it so a stuck upgrade is visible.
    blocked() {
      console.warn('[study-offline] IndexedDB upgrade waiting for another tab to close');
    },
    // A newer version is opening in another tab: release ours so it can upgrade.
    blocking() {
      void opening.then(forgetConnection, () => {});
    },
    // The browser closed the connection (storage cleared, quota, crash).
    terminated() {
      dbPromise = null;
    },
  });
  return opening;
}

/** Test helper — drops the shared promise so the next open upgrades cleanly. */
export function resetStudyOfflineDbForTests() {
  dbPromise = null;
}
