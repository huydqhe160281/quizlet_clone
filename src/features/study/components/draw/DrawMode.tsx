'use client';

import { useMemo, useState } from 'react';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { StudySessionError } from '@/features/study/components/shared/StudySessionError';
import { StudyModeShell } from '@/features/study/components/shared/StudyModeShell';
import { HanziWriterCanvas } from '@/features/study/components/draw/HanziWriterCanvas';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import { HINT_DISPLAY_MS } from '@/features/study/lib/draw-config';
import { studyProgressWhileFeedback } from '@/features/study/lib/study-continue-label';
import type { StudyCard } from '@/features/study/store';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { STUDY_MODE_LABEL_KEY } from '@/features/study/lib/study-mode-i18n';

type DrawModeProps = {
  setId: string;
};

export function DrawMode({ setId }: DrawModeProps) {
  const t = useTranslations();
  const study = useStudySession(setId, 'DRAW');
  const [showSummary, setShowSummary] = useState(false);
  const [roundEndedThisStep, setRoundEndedThisStep] = useState(false);
  const [lastRoundIndex, setLastRoundIndex] = useState(0);
  const [lastRoundCorrect, setLastRoundCorrect] = useState(0);
  const [lastRoundTotal, setLastRoundTotal] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [awaitingAdvance, setAwaitingAdvance] = useState(false);

  const roundCards = useMemo(() => {
    if (!study.currentRound) {
      return [];
    }
    return study.currentRound
      .map((id) => study.cards.find((card) => card.cardId === id))
      .filter((card): card is StudyCard => !!card);
  }, [study.currentRound, study.cards]);

  const currentCard = roundCards[study.currentIndex];

  const finishIfLast = () => {
    if (roundEndedThisStep) {
      if (study.isComplete) {
        void study.completeSession();
      } else {
        setShowSummary(true);
      }
      setRoundEndedThisStep(false);
      setHint(null);
      setAwaitingAdvance(false);
      return;
    }

    study.nextCard();
    setHint(null);
    setAwaitingAdvance(false);
  };

  const handleSkip = () => {
    handleComplete(false);
  };

  const handleComplete = (isCorrect: boolean) => {
    if (!currentCard || awaitingAdvance) {
      return;
    }

    setLastRoundIndex(study.roundIndex);
    setLastRoundTotal(roundCards.length);
    setLastRoundCorrect(study.correctInRound + (isCorrect ? 1 : 0));

    const roundEnded = study.recordRoundAnswer(currentCard.cardId, isCorrect);
    study.recordAnswer(currentCard.cardId, isCorrect);

    setRoundEndedThisStep(roundEnded);
    setHint(`${currentCard.back} — ${currentCard.front}`);
    setAwaitingAdvance(true);

    window.setTimeout(() => {
      finishIfLast();
    }, HINT_DISPLAY_MS);
  };

  if (study.isLoading) {
    return (
      <div className="glass-panel mx-auto max-w-xl animate-pulse rounded-2xl p-8 text-center text-sm text-muted-foreground">
        {t('studyUi.loadingSession')}
      </div>
    );
  }

  if (study.error) {
    return <StudySessionError setId={setId} error={study.error} />;
  }

  if (showSummary) {
    return (
      <RoundSummary
        roundIndex={lastRoundIndex}
        correctCount={lastRoundCorrect}
        total={lastRoundTotal}
        mode="DRAW"
        onNextRound={() => setShowSummary(false)}
      />
    );
  }

  if (study.isComplete) {
    return (
      <SessionComplete
        mode="DRAW"
        correctCount={study.correctCount}
        total={study.cards.length}
        setId={setId}
      />
    );
  }

  if (!currentCard) {
    return null;
  }

  return (
    <StudyModeShell
      setId={setId}
      modeLabel={t(STUDY_MODE_LABEL_KEY.DRAW)}
      progress={{
        ...studyProgressWhileFeedback(
          roundEndedThisStep,
          lastRoundTotal,
          study.currentIndex,
          roundCards.length
        ),
        label: t('study.progressDraw'),
      }}
    >
      <div className="glass-panel rounded-xl border border-border/50 p-6 text-center shadow-sm md:p-8">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t('studyUi.drawPrompt')}
        </p>
        <p className="mt-2 text-2xl font-extrabold md:text-3xl">{currentCard.back}</p>
      </div>
      <HanziWriterCanvas
        character={currentCard.front}
        back={currentCard.back}
        onComplete={(isCorrect) => handleComplete(isCorrect)}
        onSkip={handleSkip}
      />
      {hint && <p className="text-center text-sm text-muted-foreground">{hint}</p>}
    </StudyModeShell>
  );
}
