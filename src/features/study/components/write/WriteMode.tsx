'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { fuzzyMatch } from '@/lib/utils/fuzzy';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { StudyProgress } from '@/features/study/components/shared/StudyProgress';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import type { StudyCard } from '@/stores/study.store';

type WriteModeProps = {
  setId: string;
};

export function WriteMode({ setId }: WriteModeProps) {
  const study = useStudySession(setId, 'WRITE');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [showSummary, setShowSummary] = useState(false);
  const [roundEndedThisStep, setRoundEndedThisStep] = useState(false);
  const [lastRoundIndex, setLastRoundIndex] = useState(0);
  const [lastRoundCorrect, setLastRoundCorrect] = useState(0);
  const [lastRoundTotal, setLastRoundTotal] = useState(0);

  // Filter cards to only those in the current round
  const roundCards = useMemo(() => {
    if (!study.currentRound) return [];
    return study.currentRound
      .map((id) => study.cards.find((c) => c.cardId === id))
      .filter((c): c is StudyCard => !!c);
  }, [study.currentRound, study.cards]);

  const currentCard = roundCards[study.currentIndex];

  const finishIfLast = () => {
    if (roundEndedThisStep) {
      if (study.isComplete) {
        void study.completeSession();
      } else {
        setShowSummary(true);
      }
      setAnswer('');
      setFeedback(null);
      setSubmitted(false);
      setRoundEndedThisStep(false);
      return;
    }

    study.nextCard();
    setAnswer('');
    setFeedback(null);
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!currentCard || submitted) {
      return;
    }
    const isCorrect = fuzzyMatch(answer, currentCard.back);
    setSubmitted(true);
    if (isCorrect) {
      setFeedback('Correct!');
    } else {
      setFeedback(`Incorrect. Answer: ${currentCard.back}`);
    }

    // Save info of the round before recording answer (as it increments/resets store state)
    setLastRoundIndex(study.roundIndex);
    setLastRoundTotal(roundCards.length);
    setLastRoundCorrect(study.correctInRound + (isCorrect ? 1 : 0));

    const roundEnded = study.recordRoundAnswer(currentCard.cardId, isCorrect);
    await study.recordAnswer(currentCard.cardId, isCorrect);

    setRoundEndedThisStep(roundEnded);
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
        mode="WRITE"
        onNextRound={() => setShowSummary(false)}
      />
    );
  }

  if (study.isComplete) {
    return (
      <SessionComplete
        mode="WRITE"
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
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Round {study.roundIndex + 1}</span>
        <StudyProgress current={study.currentIndex + 1} total={roundCards.length} />
      </div>
      <div className="glass-panel rounded-2xl p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Type the answer</p>
        <p className="mt-2 text-2xl font-semibold">{currentCard.front}</p>
      </div>
      <Textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Your answer…"
        rows={3}
        disabled={submitted}
      />
      {!submitted ? (
        <Button className="w-full" onClick={() => void handleSubmit()} disabled={!answer.trim()}>
          Check answer
        </Button>
      ) : (
        <>
          {feedback && (
            <p
              className={`text-center text-sm ${feedback.startsWith('Correct') ? 'text-green-600' : 'text-destructive'}`}
            >
              {feedback}
            </p>
          )}
          <Button className="w-full" onClick={finishIfLast}>
            {roundEndedThisStep ? 'Finish Round' : 'Next'}
          </Button>
        </>
      )}
    </div>
  );
}
