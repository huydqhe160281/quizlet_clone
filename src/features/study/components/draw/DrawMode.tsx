'use client';

import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { StudySessionError } from '@/features/study/components/shared/StudySessionError';
import { StudyModeShell } from '@/features/study/components/shared/StudyModeShell';
import { HanziWriterCanvas } from '@/features/study/components/draw/HanziWriterCanvas';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import { useAnswerAutoAdvance } from '@/features/study/hooks/useAnswerAutoAdvance';
import { playAnswerFeedback } from '@/features/study/lib/answer-feedback';
import { HINT_DISPLAY_MS } from '@/features/study/lib/draw-config';
import {
  studyContinueKey,
  studyProgressWhileFeedback,
} from '@/features/study/lib/study-continue-label';
import { useStudyStore, type StudyCard } from '@/features/study/store';
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
  /** Result of the answered card while its hint is shown; `null` before answering. */
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  const awaitingAdvance = lastResult !== null;

  const roundCards = useMemo(() => {
    if (!study.currentRound) {
      return [];
    }
    return study.currentRound
      .map((id) => study.cards.find((card) => card.cardId === id))
      .filter((card): card is StudyCard => !!card);
  }, [study.currentRound, study.cards]);

  // The store moves to the next round synchronously on a round's last answer;
  // keep the answered card on screen while its hint is shown.
  const [answeredCard, setAnsweredCard] = useState<StudyCard | null>(null);
  const currentCard = answeredCard ?? roundCards[study.currentIndex];

  const finishIfLast = () => {
    const roundEnded = roundEndedThisStep;
    setAnsweredCard(null);
    setHint(null);
    setLastResult(null);
    setRoundEndedThisStep(false);

    if (roundEnded) {
      if (useStudyStore.getState().isComplete) {
        void study.completeSession();
      } else {
        setShowSummary(true);
      }
      return;
    }

    study.nextCard();
  };

  // Keep the stroke hint on screen for HINT_DISPLAY_MS; Continue / Enter skips the wait.
  const { advanceNow } = useAnswerAutoAdvance({
    result: lastResult,
    onAdvance: finishIfLast,
    delayMs: HINT_DISPLAY_MS,
  });

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
    setAnsweredCard(currentCard);

    const roundEnded = study.recordRoundAnswer(currentCard.cardId, isCorrect);
    study.recordAnswer(currentCard.cardId, isCorrect);

    setRoundEndedThisStep(roundEnded);
    setHint(`${currentCard.back} — ${currentCard.front}`);
    playAnswerFeedback(isCorrect);
    setLastResult(isCorrect);
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
        reviewedCount={study.reviewedCount}
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
        <p className="mt-2 break-words text-2xl font-extrabold md:text-3xl">{currentCard.back}</p>
      </div>
      <HanziWriterCanvas
        character={currentCard.front}
        back={currentCard.back}
        onComplete={(isCorrect) => handleComplete(isCorrect)}
        onSkip={handleSkip}
      />
      {hint && <p className="text-center text-sm text-muted-foreground">{hint}</p>}
      {awaitingAdvance && (
        <Button type="button" className="w-full font-bold" onClick={advanceNow}>
          {t(studyContinueKey(roundEndedThisStep))}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      )}
    </StudyModeShell>
  );
}
