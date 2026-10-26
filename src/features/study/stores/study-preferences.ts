'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Device-local study preferences (not synced to the account). */
export type StudyPreferencesState = {
  /** Play the answer-feedback chime on correct answers / "known" swipes. */
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
};

export const STUDY_PREFERENCES_STORAGE_KEY = 'study-preferences';

export const useStudyPreferences = create<StudyPreferencesState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
    }),
    {
      name: STUDY_PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ soundEnabled: state.soundEnabled }),
    }
  )
);
