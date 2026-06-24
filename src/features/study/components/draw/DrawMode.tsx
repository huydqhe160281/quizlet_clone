'use client';

import { useMemo, useState } from 'react';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { StudyProgress } from '@/features/study/components/shared/StudyProgress';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { HanziWriterCanvas } from '@/features/study/components/draw/HanziWriterCanvas';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import { HINT_DISPLAY_MS } from '@/features/study/lib/draw-config';
import type { StudyCard } from '@/stores/study.store';

type DrawModeProps = {
  setId: string;
};

export function DrawMode({ setId }: DrawModeProps) {
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
    void handleComplete(false);
  };

  const handleComplete = async (isCorrect: boolean) => {
    if (!currentCard || awaitingAdvance) {
      return;
    }

    setLastRoundIndex(study.roundIndex);
    setLastRoundTotal(roundCards.length);
    setLastRoundCorrect(study.correctInRound + (isCorrect ? 1 : 0));

    const roundEnded = study.recordRoundAnswer(currentCard.cardId, isCorrect);
    await study.recordAnswer(currentCard.cardId, isCorrect);

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
        Starting session…
      </div>
    );
  }

  if (study.error) {
    return <p className="text-sm text-destructive">{study.error}</p>;
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
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Round {study.roundIndex + 1}</span>
        <StudyProgress current={study.currentIndex + 1} total={roundCards.length} />
      </div>
      <div className="glass-panel rounded-2xl p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Vẽ ký tự cho nghĩa</p>
        <p className="mt-2 text-2xl font-semibold">{currentCard.back}</p>
      </div>
      <HanziWriterCanvas
        character={currentCard.front}
        back={currentCard.back}
        onComplete={(isCorrect) => void handleComplete(isCorrect)}
        onSkip={handleSkip}
      />
      {hint && <p className="text-center text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
