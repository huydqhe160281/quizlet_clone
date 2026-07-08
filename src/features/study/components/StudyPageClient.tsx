'use client';

import dynamic from 'next/dynamic';
import type { StudyModeValue } from '@/features/study/schemas/study.schema';

const studyLoading = () => (
  <div className="glass-panel animate-pulse rounded-2xl p-8 text-center text-sm text-muted-foreground">
    Đang tải…
  </div>
);

const FlashcardMode = dynamic(
  () => import('@/features/study/components/flashcard/FlashcardMode').then((m) => m.FlashcardMode),
  { ssr: false, loading: studyLoading }
);
const LearnMode = dynamic(
  () => import('@/features/study/components/learn/LearnMode').then((m) => m.LearnMode),
  { ssr: false, loading: studyLoading }
);
const WriteMode = dynamic(
  () => import('@/features/study/components/write/WriteMode').then((m) => m.WriteMode),
  { ssr: false, loading: studyLoading }
);
const TestMode = dynamic(
  () => import('@/features/study/components/test/TestMode').then((m) => m.TestMode),
  { ssr: false, loading: studyLoading }
);
const DrawMode = dynamic(
  () => import('@/features/study/components/draw/DrawMode').then((m) => m.DrawMode),
  { ssr: false, loading: studyLoading }
);

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
  }[mode];

  return <ModeComponent setId={setId} />;
}
