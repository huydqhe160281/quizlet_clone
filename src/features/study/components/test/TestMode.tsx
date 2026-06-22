'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fuzzyMatch } from '@/lib/utils/fuzzy';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { StudyProgress } from '@/features/study/components/shared/StudyProgress';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import { generateTestQuestions, type TestQuestion } from '@/features/study/lib/test-generator';
import type { StudyCard } from '@/stores/study.store';

type TestModeProps = {
  setId: string;
};

export function TestMode({ setId }: TestModeProps) {
  const study = useStudySession(setId, 'TEST');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [typingAnswer, setTypingAnswer] = useState('');
  const [answered, setAnswered] = useState(false);

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

  const questions = useMemo(
    () =>
      generateTestQuestions(
        roundCards.map((card) => ({ id: card.cardId, front: card.front, back: card.back }))
      ),
    [roundCards]
  );

  const currentQuestion: TestQuestion | undefined = questions[questionIndex];

  const goNext = () => {
    if (roundEndedThisStep) {
      if (study.isComplete) {
        void study.completeSession();
      } else {
        setShowSummary(true);
      }
      setQuestionIndex(0);
      setFeedback(null);
      setTypingAnswer('');
      setAnswered(false);
      setRoundEndedThisStep(false);
      return;
    }

    setQuestionIndex((value) => value + 1);
    setFeedback(null);
    setTypingAnswer('');
    setAnswered(false);
  };

  const recordResult = async (cardId: string, isCorrect: boolean) => {
    // Save info of the round before recording answer (as it increments/resets store state)
    setLastRoundIndex(study.roundIndex);
    setLastRoundTotal(roundCards.length);
    setLastRoundCorrect(study.correctInRound + (isCorrect ? 1 : 0));

    const roundEnded = study.recordRoundAnswer(cardId, isCorrect);
    await study.recordAnswer(cardId, isCorrect);

    setRoundEndedThisStep(roundEnded);
    setAnswered(true);
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
        mode="TEST"
        onNextRound={() => setShowSummary(false)}
      />
    );
  }

  if (study.isComplete) {
    return (
      <SessionComplete
        mode="TEST"
        correctCount={study.correctCount}
        total={study.cards.length}
        setId={setId}
      />
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Round {study.roundIndex + 1}</span>
        <StudyProgress current={questionIndex + 1} total={questions.length} />
      </div>
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm uppercase text-muted-foreground">{currentQuestion.type}</p>
        <p className="mt-2 text-xl font-semibold">{currentQuestion.front}</p>
      </div>

      {currentQuestion.type === 'mc' && (
        <div className="grid gap-2">
          {currentQuestion.options.map((option) => (
            <Button
              key={option}
              variant="outline"
              className="h-auto whitespace-normal py-3 text-left"
              disabled={answered}
              onClick={() => {
                const isCorrect = option === currentQuestion.correctBack;
                void recordResult(currentQuestion.cardId, isCorrect);
                setFeedback(
                  isCorrect ? 'Correct!' : `Incorrect. Answer: ${currentQuestion.correctBack}`
                );
              }}
            >
              {option}
            </Button>
          ))}
        </div>
      )}

      {currentQuestion.type === 'tf' && (
        <div className="space-y-3">
          <p className="text-center text-lg">{currentQuestion.shownBack}</p>
          <p className="text-center text-sm text-muted-foreground">Is this pairing correct?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={answered}
              onClick={() => {
                const isCorrect = currentQuestion.isPairCorrect;
                void recordResult(currentQuestion.cardId, isCorrect);
                setFeedback(isCorrect ? 'Correct!' : 'Incorrect pairing.');
              }}
            >
              True
            </Button>
            <Button
              variant="outline"
              disabled={answered}
              onClick={() => {
                const isCorrect = !currentQuestion.isPairCorrect;
                void recordResult(currentQuestion.cardId, isCorrect);
                setFeedback(isCorrect ? 'Correct!' : 'Incorrect pairing.');
              }}
            >
              False
            </Button>
          </div>
        </div>
      )}

      {currentQuestion.type === 'typing' && (
        <div className="space-y-3">
          <Input
            value={typingAnswer}
            onChange={(event) => setTypingAnswer(event.target.value)}
            placeholder="Type your answer…"
            disabled={answered}
          />
          {!answered ? (
            <Button
              className="w-full"
              disabled={!typingAnswer.trim()}
              onClick={() => {
                const isCorrect = fuzzyMatch(typingAnswer, currentQuestion.back);
                void recordResult(currentQuestion.cardId, isCorrect);
                setFeedback(isCorrect ? 'Correct!' : `Incorrect. Answer: ${currentQuestion.back}`);
              }}
            >
              Submit
            </Button>
          ) : null}
        </div>
      )}

      {feedback && (
        <p
          className={`text-center text-sm ${feedback.startsWith('Correct') ? 'text-green-600' : 'text-destructive'}`}
        >
          {feedback}
        </p>
      )}

      {answered && (
        <Button className="w-full" onClick={goNext}>
          {roundEndedThisStep ? 'Finish round' : 'Next question'}
        </Button>
      )}
    </div>
  );
}
