'use client';

import dynamic from 'next/dynamic';
import type { StudyModeValue } from '@/features/study/schemas/study.schema';
import { studyModeLoaders } from '@/features/study/lib/study-mode-loaders';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

function StudyLoading() {
  const t = useTranslations();
  return (
    <div className="glass-panel animate-pulse rounded-2xl p-8 text-center text-sm text-muted-foreground">
      {t('ui.loading')}
    </div>
  );
}

const modeOptions = { ssr: false, loading: () => <StudyLoading /> } as const;

const FlashcardMode = dynamic(studyModeLoaders.FLASHCARD, modeOptions);
const LearnMode = dynamic(studyModeLoaders.LEARN, modeOptions);
const WriteMode = dynamic(studyModeLoaders.WRITE, modeOptions);
const TestMode = dynamic(studyModeLoaders.TEST, modeOptions);
const DrawMode = dynamic(studyModeLoaders.DRAW, modeOptions);
const GravityMode = dynamic(studyModeLoaders.GRAVITY, modeOptions);

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
