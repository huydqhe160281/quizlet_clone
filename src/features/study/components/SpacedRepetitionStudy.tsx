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
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type StudyStyle = 'flashcard' | 'multiple_choice' | 'default';

interface SpacedRepetitionSettings {
  style: StudyStyle;
  cardsPerRound: number;
  randomize: boolean;
  requeueWrong: boolean;
}

export function SpacedRepetitionStudy() {
  const t = useTranslations();
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
  const [feedbackOk, setFeedbackOk] = useState(false);

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
      setFeedback(t('studyUi.spacedCorrect'));
      setFeedbackOk(true);
      setCorrectCount((c) => c + 1);
      setCorrectInRound((c) => c + 1);
      await submitReview(currentCard.cardId, 'GOOD');
    } else {
      setFeedback(t('studyUi.incorrectWithAnswer', { answer: currentCard.back }));
      setFeedbackOk(false);
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
      setFeedback(t('studyUi.spacedCorrect'));
      setFeedbackOk(true);
      setCorrectCount((c) => c + 1);
      setCorrectInRound((c) => c + 1);
      await submitReview(currentCard.cardId, 'GOOD');
    } else {
      setFeedback(t('studyUi.incorrectWithAnswer', { answer: currentCard.back }));
      setFeedbackOk(false);
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
    setFeedbackOk(false);
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
        {t('studyUi.spacedLoadingDue')}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{t('studyUi.spacedLoadFailed')}</p>;
  }

  if (totalCards === 0 && !started) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold">{t('studyUi.spacedCaughtUpTitle')}</h2>
        <p className="mt-2 text-muted-foreground">{t('studyUi.spacedCaughtUpHint')}</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard">{t('studyUi.spacedBackDashboard')}</Link>
        </Button>
      </div>
    );
  }

  if (!started) {
    const maxPerRound = Math.min(50, totalCards);
    return (
      <Card className="glass-panel w-full max-w-lg mx-auto overflow-hidden rounded-2xl border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle>{t('studyUi.spacedSettingsTitle')}</CardTitle>
          <CardDescription>
            {t('studyUi.spacedSettingsSubtitle', { count: totalCards })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="study-style">{t('studyUi.spacedStyle')}</Label>
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
                <SelectValue placeholder={t('studyUi.spacedStylePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">{t('studyUi.spacedMc')}</SelectItem>
                <SelectItem value="default">{t('studyUi.spacedWritten')}</SelectItem>
                <SelectItem value="flashcard">{t('studyUi.spacedFlashcard')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="cards-per-round-input">{t('study.settings.cardsPerRound')}</Label>
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
                <span className="text-sm text-muted-foreground">
                  {t('study.settings.cardsUnit')}
                </span>
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
              {t('study.settings.cardsRange', { max: maxPerRound > 0 ? maxPerRound : 50 })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="randomize"
              checked={settings.randomize}
              onCheckedChange={(c) => setSettings((s) => ({ ...s, randomize: c === true }))}
            />
            <Label htmlFor="randomize" className="font-normal cursor-pointer">
              {t('study.settings.randomize')}
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="requeue-wrong"
              checked={settings.requeueWrong}
              onCheckedChange={(c) => setSettings((s) => ({ ...s, requeueWrong: c === true }))}
            />
            <Label htmlFor="requeue-wrong" className="font-normal cursor-pointer">
              {t('study.settings.requeueWrong')}
            </Label>
          </div>

          <Button onClick={handleStart} className="w-full" size="lg">
            {t('studyUi.spacedStart')}
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
        <span>{t('studyUi.roundBadge', { round: roundIndex + 1 })}</span>
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
            <p className="text-sm text-muted-foreground">{t('studyUi.spacedChooseAnswer')}</p>
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
            <p className="text-sm text-muted-foreground">{t('studyUi.spacedTypeAnswer')}</p>
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
              placeholder={t('studyUi.spacedTypePlaceholder')}
              rows={3}
              disabled={Boolean(selectedOption)}
            />
            {!selectedOption && (
              <Button
                className="w-full"
                onClick={() => void handleWrittenAnswer()}
                disabled={!typedAnswer.trim()}
              >
                {t('studyUi.checkAnswer')}
              </Button>
            )}
          </div>
        </>
      )}

      {feedback && (
        <p className={`text-center text-sm ${feedbackOk ? 'text-green-600' : 'text-destructive'}`}>
          {feedback}
        </p>
      )}
      {selectedOption && (
        <Button className="w-full" onClick={handleNextQuestion}>
          {currentIndex >= currentRound.length - 1
            ? t('studyUi.spacedFinishRound')
            : t('studyUi.nextQuestion')}
        </Button>
      )}
    </div>
  );
}
