'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FlashcardViewer,
  useFlipState,
} from '@/features/study/components/flashcard/FlashcardViewer';
import { GradeButtons } from '@/features/study/components/shared/GradeButtons';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { StudyProgress } from '@/features/study/components/shared/StudyProgress';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { useDueCards, useSubmitReview } from '@/features/study/hooks/useSpacedRepetition';
import { generateLearnOptions } from '@/features/study/lib/test-generator';
import { fuzzyMatch } from '@/lib/utils/fuzzy';

type StudyStyle = 'flashcard' | 'multiple_choice' | 'default';

interface SpacedRepetitionSettings {
  style: StudyStyle;
  cardsPerRound: number;
  randomize: boolean;
  requeueWrong: boolean;
}

export function SpacedRepetitionStudy() {
  const { data, isLoading, error, refetch } = useDueCards();
  const submitReview = useSubmitReview();
  const { isFlipped, flip, resetFlip } = useFlipState();

  const [started, setStarted] = useState(false);
  const [settings, setSettings] = useState<SpacedRepetitionSettings>({
    style: 'multiple_choice',
    cardsPerRound: 10,
    randomize: false,
    requeueWrong: true,
  });

  const [deckIds, setDeckIds] = useState<string[]>([]);
  const [deckCursor, setDeckCursor] = useState(0);
  const [currentRound, setCurrentRound] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remediationQueue, setRemediationQueue] = useState<string[]>([]);

  const [correctCount, setCorrectCount] = useState(0);
  const [correctInRound, setCorrectInRound] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [done, setDone] = useState(false);

  // Written & MCQ answer states
  const [typedAnswer, setTypedAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const cards = data?.data ?? [];
  const totalCards = cards.length;

  const roundCards = useMemo(() => {
    return currentRound
      .map((id) => cards.find((c) => c.cardId === id))
      .filter((c): c is NonNullable<typeof c> => !!c);
  }, [currentRound, cards]);

  const currentCard = roundCards[currentIndex];

  const options = useMemo(() => {
    if (!currentCard) return [];
    return generateLearnOptions(
      cards.map((c) => ({ id: c.cardId, front: c.front, back: c.back })),
      { id: currentCard.cardId, front: currentCard.front, back: currentCard.back }
    );
  }, [currentCard, cards]);

  const handleStart = () => {
    if (totalCards === 0) return;
    let initialDeck = cards.map((c) => c.cardId);
    if (settings.randomize) {
      initialDeck = [...initialDeck].sort(() => Math.random() - 0.5);
    }
    setDeckIds(initialDeck);
    const limit = Math.min(settings.cardsPerRound, initialDeck.length);
    setDeckCursor(limit);
    setCurrentRound(initialDeck.slice(0, limit));
    setCurrentIndex(0);
    setRemediationQueue([]);
    setCorrectCount(0);
    setCorrectInRound(0);
    setRoundIndex(0);
    setStarted(true);
    setDone(false);
    setShowRoundSummary(false);
  };

  const handleGrade = async (grade: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    if (!currentCard) return;
    await submitReview(currentCard.cardId, grade);
    resetFlip();

    const isCorrect = grade !== 'AGAIN';
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setCorrectInRound((c) => c + 1);
    } else if (settings.requeueWrong) {
      setRemediationQueue((q) => {
        if (!q.includes(currentCard.cardId)) {
          return [...q, currentCard.cardId];
        }
        return q;
      });
    }

    if (currentIndex >= currentRound.length - 1) {
      setShowRoundSummary(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleMCQAnswer = async (option: string) => {
    if (!currentCard || selectedOption) return;
    setSelectedOption(option);
    const isCorrect = option === currentCard.back;

    if (isCorrect) {
      setFeedback('Correct!');
      setCorrectCount((c) => c + 1);
      setCorrectInRound((c) => c + 1);
      await submitReview(currentCard.cardId, 'GOOD');
    } else {
      setFeedback(`Incorrect. Answer: ${currentCard.back}`);
      await submitReview(currentCard.cardId, 'AGAIN');
      if (settings.requeueWrong) {
        setRemediationQueue((q) => {
          if (!q.includes(currentCard.cardId)) {
            return [...q, currentCard.cardId];
          }
          return q;
        });
      }
    }
  };

  const handleWrittenAnswer = async () => {
    if (!currentCard || selectedOption || !typedAnswer.trim()) return;
    setSelectedOption(typedAnswer);
    const isCorrect = fuzzyMatch(typedAnswer, currentCard.back);

    if (isCorrect) {
      setFeedback('Correct!');
      setCorrectCount((c) => c + 1);
      setCorrectInRound((c) => c + 1);
      await submitReview(currentCard.cardId, 'GOOD');
    } else {
      setFeedback(`Incorrect. Answer: ${currentCard.back}`);
      await submitReview(currentCard.cardId, 'AGAIN');
      if (settings.requeueWrong) {
        setRemediationQueue((q) => {
          if (!q.includes(currentCard.cardId)) {
            return [...q, currentCard.cardId];
          }
          return q;
        });
      }
    }
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    setSelectedOption(null);
    setTypedAnswer('');

    if (currentIndex >= currentRound.length - 1) {
      setShowRoundSummary(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleNextRound = () => {
    setShowRoundSummary(false);

    const remainingDeck = deckIds.length - deckCursor;
    const hasMore = remainingDeck > 0 || remediationQueue.length > 0;

    if (!hasMore) {
      setDone(true);
      void refetch();
      return;
    }

    const nextRoundCards = [...remediationQueue];
    let newCursor = deckCursor;

    while (nextRoundCards.length < settings.cardsPerRound && newCursor < deckIds.length) {
      nextRoundCards.push(deckIds[newCursor]!);
      newCursor++;
    }

    setDeckCursor(newCursor);
    setRemediationQueue([]);
    setCurrentRound(nextRoundCards);
    setCurrentIndex(0);
    setRoundIndex((prev) => prev + 1);
    setCorrectInRound(0);
  };

  if (isLoading) {
    return (
      <div className="glass-panel animate-pulse rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Loading due cards…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load due cards.</p>;
  }

  if (totalCards === 0 && !started) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold">All caught up!</h2>
        <p className="mt-2 text-muted-foreground">No cards due for review right now.</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!started) {
    const maxPerRound = Math.min(50, totalCards);
    return (
      <Card className="glass-panel w-full max-w-lg mx-auto overflow-hidden rounded-2xl border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle>Spaced Repetition Study Settings</CardTitle>
          <CardDescription>
            Configure your SM-2 session — {totalCards} due cards available today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Study style selection */}
          <div className="space-y-2">
            <Label htmlFor="study-style">Study style</Label>
            <Select
              value={settings.style}
              onValueChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  style: v as StudyStyle,
                }))
              }
            >
              <SelectTrigger id="study-style">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice (Trắc nghiệm)</SelectItem>
                <SelectItem value="default">Written (Tự viết/Tự luận)</SelectItem>
                <SelectItem value="flashcard">Flashcards (Tự đánh giá)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards per round */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="cards-per-round-input">Cards per round</Label>
              <div className="flex items-center gap-2">
                <input
                  id="cards-per-round-input"
                  type="number"
                  min={1}
                  max={50}
                  value={settings.cardsPerRound}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setSettings((s) => ({
                        ...s,
                        cardsPerRound: Math.max(1, Math.min(50, val)),
                      }));
                    }
                  }}
                  className="w-16 rounded-md border border-input bg-transparent px-2 py-1 text-right text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <span className="text-sm text-muted-foreground">cards</span>
              </div>
            </div>
            <Slider
              id="cards-per-round"
              min={1}
              max={maxPerRound > 0 ? maxPerRound : 10}
              step={1}
              value={[settings.cardsPerRound]}
              onValueChange={([v]) =>
                setSettings((s) => ({ ...s, cardsPerRound: v ?? s.cardsPerRound }))
              }
            />
            <p className="text-xs text-muted-foreground">
              1–{maxPerRound > 0 ? maxPerRound : 50} cards per round
            </p>
          </div>

          {/* Randomize */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="randomize"
              checked={settings.randomize}
              onCheckedChange={(c) => setSettings((s) => ({ ...s, randomize: c === true }))}
            />
            <Label htmlFor="randomize" className="font-normal cursor-pointer">
              Randomize cards
            </Label>
          </div>

          {/* Requeue wrong */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="requeue-wrong"
              checked={settings.requeueWrong}
              onCheckedChange={(c) => setSettings((s) => ({ ...s, requeueWrong: c === true }))}
            />
            <Label htmlFor="requeue-wrong" className="font-normal cursor-pointer">
              Review wrong answers in next round
            </Label>
          </div>

          <Button onClick={handleStart} className="w-full" size="lg">
            Start session
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showRoundSummary) {
    return (
      <RoundSummary
        roundIndex={roundIndex}
        correctCount={correctInRound}
        total={roundCards.length}
        mode="SM-2"
        onNextRound={handleNextRound}
      />
    );
  }

  if (done) {
    return (
      <SessionComplete
        mode="SM-2"
        correctCount={correctCount}
        total={deckIds.length}
        setId={currentCard?.setId ?? ''}
      />
    );
  }

  if (!currentCard) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Round {roundIndex + 1}</span>
        <StudyProgress current={currentIndex + 1} total={roundCards.length} />
      </div>
      <p className="text-center text-sm text-muted-foreground">{currentCard.setTitle}</p>

      {settings.style === 'flashcard' ? (
        <>
          <FlashcardViewer
            front={currentCard.front}
            back={currentCard.back}
            isFlipped={isFlipped}
            onFlip={flip}
          />
          <GradeButtons
            onAgain={() => void handleGrade('AGAIN')}
            onHard={() => void handleGrade('HARD')}
            onGood={() => void handleGrade('GOOD')}
            onEasy={() => void handleGrade('EASY')}
          />
        </>
      ) : settings.style === 'multiple_choice' ? (
        <>
          <div className="glass-panel rounded-2xl p-6 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">Choose the correct answer</p>
            <p className="mt-2 text-2xl font-semibold">{currentCard.front}</p>
          </div>
          <div className="grid gap-2">
            {options.map((option) => (
              <Button
                key={option}
                variant={selectedOption === option ? 'default' : 'outline'}
                className="h-auto whitespace-normal py-3 text-left"
                disabled={Boolean(selectedOption)}
                onClick={() => {
                  void handleMCQAnswer(option);
                }}
              >
                {option}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="glass-panel rounded-2xl p-6 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">Type the answer</p>
            <p className="mt-2 text-2xl font-semibold">{currentCard.front}</p>
          </div>
          <div className="space-y-4">
            <Textarea
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !selectedOption) {
                  e.preventDefault();
                  void handleWrittenAnswer();
                }
              }}
              placeholder="Type your answer…"
              rows={3}
              disabled={Boolean(selectedOption)}
            />
            {!selectedOption && (
              <Button
                className="w-full"
                onClick={() => void handleWrittenAnswer()}
                disabled={!typedAnswer.trim()}
              >
                Check answer
              </Button>
            )}
          </div>
        </>
      )}

      {feedback && (
        <p
          className={`text-center text-sm ${feedback.startsWith('Correct') ? 'text-green-600' : 'text-destructive'}`}
        >
          {feedback}
        </p>
      )}
      {selectedOption && (
        <Button className="w-full" onClick={handleNextQuestion}>
          {currentIndex >= currentRound.length - 1 ? 'Finish Round' : 'Next question'}
        </Button>
      )}
    </div>
  );
}
