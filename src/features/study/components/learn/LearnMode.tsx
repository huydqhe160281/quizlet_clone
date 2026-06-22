'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { StudyProgress } from '@/features/study/components/shared/StudyProgress';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import { generateLearnOptions } from '@/features/study/lib/test-generator';
import { fuzzyMatch } from '@/lib/utils/fuzzy';
import type { StudyCard } from '@/stores/study.store';

type LearnModeProps = {
  setId: string;
};

export function LearnMode({ setId }: LearnModeProps) {
  const study = useStudySession(setId, 'LEARN');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');

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

  const options = useMemo(() => {
    if (!currentCard) {
      return [];
    }
    // Generate wrong choices using all cards in the deck
    return generateLearnOptions(
      study.cards.map((card) => ({ id: card.cardId, front: card.front, back: card.back })),
      { id: currentCard.cardId, front: currentCard.front, back: currentCard.back }
    );
  }, [currentCard, study.cards]);

  const finishIfLast = () => {
    if (roundEndedThisStep) {
      if (study.isComplete) {
        void study.completeSession();
      } else {
        setShowSummary(true);
      }
      setFeedback(null);
      setSelected(null);
      setAnswer('');
      setRoundEndedThisStep(false);
      return;
    }

    study.nextCard();
    setFeedback(null);
    setSelected(null);
    setAnswer('');
  };

  const handleAnswer = async (option: string) => {
    if (!currentCard || selected) {
      return;
    }
    setSelected(option);
    const isCorrect = option === currentCard.back;
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

  const handleWrittenAnswer = async () => {
    if (!currentCard || selected || !answer.trim()) {
      return;
    }
    setSelected(answer);
    const isCorrect = fuzzyMatch(answer, currentCard.back);
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
    return <p className="text-sm text-muted-foreground">Starting session…</p>;
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
        mode="LEARN"
        onNextRound={() => setShowSummary(false)}
      />
    );
  }

  if (study.isComplete) {
    return (
      <SessionComplete
        mode="LEARN"
        correctCount={study.correctCount}
        total={study.cards.length}
        setId={setId}
      />
    );
  }

  if (!currentCard) {
    return null;
  }

  const isMultipleChoice = study.settings?.presentation !== 'default';

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Round {study.roundIndex + 1}</span>
        <StudyProgress current={study.currentIndex + 1} total={roundCards.length} />
      </div>
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {isMultipleChoice ? 'Choose the correct answer' : 'Type the answer'}
        </p>
        <p className="mt-2 text-2xl font-semibold">{currentCard.front}</p>
      </div>

      {isMultipleChoice ? (
        <div className="grid gap-2">
          {options.map((option) => (
            <Button
              key={option}
              variant={selected === option ? 'default' : 'outline'}
              className="h-auto whitespace-normal py-3 text-left"
              disabled={Boolean(selected)}
              onClick={() => {
                void handleAnswer(option);
              }}
            >
              {option}
            </Button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !selected) {
                event.preventDefault();
                void handleWrittenAnswer();
              }
            }}
            placeholder="Type your answer…"
            rows={3}
            disabled={Boolean(selected)}
          />
          {!selected && (
            <Button
              className="w-full"
              onClick={() => void handleWrittenAnswer()}
              disabled={!answer.trim()}
            >
              Check answer
            </Button>
          )}
        </div>
      )}

      {feedback && (
        <p
          className={`text-center text-sm ${feedback.startsWith('Correct') ? 'text-green-600' : 'text-destructive'}`}
        >
          {feedback}
        </p>
      )}
      {selected && (
        <Button className="w-full" onClick={finishIfLast}>
          {roundEndedThisStep ? 'Finish Round' : 'Next question'}
        </Button>
      )}
    </div>
  );
}
