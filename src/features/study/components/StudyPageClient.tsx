'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { StudyModeValue } from '@/features/study/schemas/study.schema';

const studyLoading = () => (
  <div className="glass-panel animate-pulse rounded-2xl p-8 text-center text-sm text-muted-foreground">
    Loading…
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

const titles: Record<StudyModeValue, string> = {
  FLASHCARD: 'Flashcards',
  LEARN: 'Learn',
  WRITE: 'Write',
  TEST: 'Test',
};

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
  }[mode];

  return (
    <div className="space-y-6">
      <ButtonBack setId={setId} title={titles[mode]} />
      <ModeComponent setId={setId} />
    </div>
  );
}

function ButtonBack({ setId, title }: { setId: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/sets/${setId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to set
      </Link>
      <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
        {title}
      </h1>
    </div>
  );
}
