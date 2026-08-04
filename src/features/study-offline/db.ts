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

/** Opens (or reuses) the offline study IndexedDB connection. */
export function getStudyOfflineDb(): Promise<IDBPDatabase<StudyOfflineDb>> {
  if (!dbPromise) {
    dbPromise = openDB<StudyOfflineDb>(DB_NAME, DB_VERSION, {
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
    });
  }
  return dbPromise;
}

/** Test helper — drops the shared promise so the next open upgrades cleanly. */
export function resetStudyOfflineDbForTests() {
  dbPromise = null;
}
