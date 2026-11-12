import type { ComponentType } from 'react';
import type { StudyModeValue } from '@/features/study/schemas/study.schema';

/**
 * Chunk loaders for each study mode. `StudyPageClient` renders through them, and the
 * launcher / settings form call `preloadStudyMode` while the user is still choosing,
 * so the mode's JS is usually cached before the session page mounts.
 */
export const studyModeLoaders = {
  FLASHCARD: () =>
    import('@/features/study/components/flashcard/FlashcardMode').then((m) => m.FlashcardMode),
  LEARN: () => import('@/features/study/components/learn/LearnMode').then((m) => m.LearnMode),
  WRITE: () => import('@/features/study/components/write/WriteMode').then((m) => m.WriteMode),
  TEST: () => import('@/features/study/components/test/TestMode').then((m) => m.TestMode),
  DRAW: () => import('@/features/study/components/draw/DrawMode').then((m) => m.DrawMode),
  GRAVITY: () =>
    import('@/features/study/components/gravity/GravityMode').then((m) => m.GravityMode),
} satisfies Record<StudyModeValue, () => Promise<ComponentType<{ setId: string }>>>;

export function preloadStudyMode(mode: StudyModeValue): void {
  // A failed preload is harmless: the page retries the same import when it mounts.
  studyModeLoaders[mode]().catch(() => undefined);
}
