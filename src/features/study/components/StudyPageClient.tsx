'use client';

import dynamic from 'next/dynamic';
import type { StudyModeValue } from '@/features/study/schemas/study.schema';
import { studyModeLoaders } from '@/features/study/lib/study-mode-loaders';
import { StudySessionSkeleton } from '@/features/study/components/shared/StudySkeletons';

// next/dynamic options must be an object literal at each call site: the SWC
// transform rejects a shared variable and the build fails.
const FlashcardMode = dynamic(studyModeLoaders.FLASHCARD, {
  ssr: false,
  loading: () => <StudySessionSkeleton variant="flashcard" />,
});
const LearnMode = dynamic(studyModeLoaders.LEARN, {
  ssr: false,
  loading: () => <StudySessionSkeleton variant="quiz" />,
});
const WriteMode = dynamic(studyModeLoaders.WRITE, {
  ssr: false,
  loading: () => <StudySessionSkeleton variant="write" />,
});
const TestMode = dynamic(studyModeLoaders.TEST, {
  ssr: false,
  loading: () => <StudySessionSkeleton variant="quiz" />,
});
const DrawMode = dynamic(studyModeLoaders.DRAW, {
  ssr: false,
  loading: () => <StudySessionSkeleton variant="draw" />,
});
const GravityMode = dynamic(studyModeLoaders.GRAVITY, {
  ssr: false,
  loading: () => <StudySessionSkeleton variant="gravity" />,
});

type StudyPageClientProps = {
  setId: string;
  mode: StudyModeValue;
};

export function StudyPageClient({ setId, mode }: StudyPageClientProps) {
  const ModeComponent = {
    FLASHCARD: FlashcardMode,
    LEARN: LearnMode,
    WRITE: WriteMode,
    TEST: TestMode,
    DRAW: DrawMode,
    GRAVITY: GravityMode,
  }[mode];

  return <ModeComponent setId={setId} />;
}
