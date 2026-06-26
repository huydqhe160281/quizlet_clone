'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  FlashcardViewer,
  useFlipState,
} from '@/features/study/components/flashcard/FlashcardViewer';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { StudyProgress } from '@/features/study/components/shared/StudyProgress';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import type { StudyCard } from '@/features/study/store';

type FlashcardModeProps = {
  setId: string;
};

export function FlashcardMode({ setId }: FlashcardModeProps) {
  const study = useStudySession(setId, 'FLASHCARD');
  const { isFlipped, flip, resetFlip } = useFlipState();
  const touchStartX = useRef<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [lastRoundIndex, setLastRoundIndex] = useState(0);
  const [lastRoundSize, setLastRoundSize] = useState(0);

  // Filter cards to only those in the current round
  const roundCards = useMemo(() => {
    if (!study.currentRound) return [];
    return study.currentRound
      .map((id) => study.cards.find((c) => c.cardId === id))
      .filter((c): c is StudyCard => !!c);
  }, [study.currentRound, study.cards]);

  const currentCard = roundCards[study.currentIndex];

  const goNext = useCallback(async () => {
    if (!currentCard) return;
    resetFlip();

    setLastRoundIndex(study.roundIndex);
    setLastRoundSize(roundCards.length);

    // Flashcard records as "correct" (reviewed) to advance round engine
    const roundEnded = study.recordRoundAnswer(currentCard.cardId, true);
    study.recordAnswer(currentCard.cardId, true);

    if (roundEnded) {
      if (study.isComplete) {
        await study.completeSession(study.reviewedCount + 1);
      } else {
        setShowSummary(true);
      }
    } else {
      study.nextCard();
    }
  }, [currentCard, study, roundCards.length, resetFlip]);

  const goPrev = useCallback(() => {
    resetFlip();
    study.prevCard();
  }, [study, resetFlip]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (study.isComplete || showSummary || !currentCard) {
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        flip();
      }
      if (event.code === 'ArrowRight') {
        void goNext();
      }
      if (event.code === 'ArrowLeft') {
        goPrev();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [study.isComplete, showSummary, currentCard, flip, goNext, goPrev]);

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
        correctCount={lastRoundSize}
        total={lastRoundSize}
        mode="FLASHCARD"
        onNextRound={() => setShowSummary(false)}
      />
    );
  }

  if (study.isComplete) {
    return (
      <SessionComplete
        mode="FLASHCARD"
        correctCount={0}
        reviewedCount={study.reviewedCount}
        total={study.cards.length}
        setId={setId}
      />
    );
  }

  if (!currentCard) {
    return <p className="text-sm text-muted-foreground">No cards in this set.</p>;
  }

  return (
    <div
      className="glass-panel mx-auto max-w-xl space-y-6 rounded-2xl p-4 shadow-sm md:p-6"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        if (start === null || end === undefined) {
          return;
        }
        const delta = end - start;
        if (delta > 50) {
          goPrev();
        } else if (delta < -50) {
          void goNext();
        }
      }}
    >
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Round {study.roundIndex + 1}</span>
        <StudyProgress current={study.currentIndex + 1} total={roundCards.length} />
      </div>
      <FlashcardViewer
        front={currentCard.front}
        back={currentCard.back}
        example={currentCard.example}
        imageUrl={currentCard.imageUrl}
        isFlipped={isFlipped}
        onFlip={flip}
      />
      <div className="flex justify-between">
        <Button variant="outline" onClick={goPrev} disabled={study.currentIndex === 0}>
          Previous
        </Button>
        <Button onClick={() => void goNext()}>
          {study.currentIndex >= roundCards.length - 1 ? 'Finish Round' : 'Next'}
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Space to flip · Arrow keys or swipe to navigate
      </p>
    </div>
  );
}
