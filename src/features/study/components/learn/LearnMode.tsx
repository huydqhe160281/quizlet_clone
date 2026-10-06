'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, HelpCircle, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { StudySessionError } from '@/features/study/components/shared/StudySessionError';
import { StudyModeShell } from '@/features/study/components/shared/StudyModeShell';
import { speakStudyText } from '@/features/study/components/flashcard/FlashcardViewer';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import { resolveLearnMcq } from '@/features/study/lib/test-generator';
import {
  studyContinueKey,
  studyProgressWhileFeedback,
} from '@/features/study/lib/study-continue-label';
import { playCorrectFeedbackSound } from '@/features/study/lib/study-feedback-sound';
import { fuzzyMatch } from '@/lib/utils/fuzzy';
import type { StudyCard } from '@/features/study/store';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { STUDY_MODE_LABEL_KEY } from '@/features/study/lib/study-mode-i18n';

/** Brief pause so correct-answer feedback is visible before auto-advance. */
export const LEARN_CORRECT_AUTO_ADVANCE_MS = 1000;
/** Longer pause on incorrect answers; Continue still advances immediately. */
export const LEARN_INCORRECT_AUTO_ADVANCE_MS = 5000;

type LearnModeProps = {
  setId: string;
};

export function LearnMode({ setId }: LearnModeProps) {
  const t = useTranslations();
  const study = useStudySession(setId, 'LEARN');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [isCorrectAnswer, setIsCorrectAnswer] = useState<boolean | null>(null);

  const [showSummary, setShowSummary] = useState(false);
  const [roundEndedThisStep, setRoundEndedThisStep] = useState(false);
  const [lastRoundIndex, setLastRoundIndex] = useState(0);
  const [lastRoundCorrect, setLastRoundCorrect] = useState(0);
  const [lastRoundTotal, setLastRoundTotal] = useState(0);
  const isAdvancingRef = useRef(false);

  const roundCards = useMemo(() => {
    if (!study.currentRound) return [];
    return study.currentRound
      .map((id) => study.cards.find((c) => c.cardId === id))
      .filter((c): c is StudyCard => !!c);
  }, [study.currentRound, study.cards]);

  const currentCard = roundCards[study.currentIndex];
  const isMultipleChoice = study.settings?.presentation !== 'default';
  const mcDirection = study.settings?.mcDirection ?? 'front_to_back';

  const cardInputs = useMemo(
    () => study.cards.map((card) => ({ id: card.cardId, front: card.front, back: card.back })),
    [study.cards]
  );

  const learnMcq = useMemo(() => {
    if (!currentCard || !isMultipleChoice) {
      return null;
    }
    return resolveLearnMcq(
      cardInputs,
      { id: currentCard.cardId, front: currentCard.front, back: currentCard.back },
      mcDirection
    );
  }, [currentCard, cardInputs, isMultipleChoice, mcDirection]);

  const mcPrompt = learnMcq?.prompt ?? currentCard?.front ?? '';
  const mcCorrectAnswer = learnMcq?.correctAnswer ?? currentCard?.back ?? '';
  const options = learnMcq?.options ?? [];

  const resetQuestionState = () => {
    setFeedback(null);
    setSelected(null);
    setAnswer('');
    setIsCorrectAnswer(null);
  };

  const finishIfLast = () => {
    if (roundEndedThisStep) {
      if (study.isComplete) {
        void study.completeSession();
      } else {
        setShowSummary(true);
      }
      resetQuestionState();
      setRoundEndedThisStep(false);
      return;
    }

    study.nextCard();
    resetQuestionState();
  };

  const finishIfLastRef = useRef(finishIfLast);
  finishIfLastRef.current = finishIfLast;

  const advanceAfterAnswer = () => {
    if (isAdvancingRef.current) {
      return;
    }
    isAdvancingRef.current = true;
    finishIfLastRef.current();
  };

  useEffect(() => {
    if (selected === null || isCorrectAnswer === null) {
      isAdvancingRef.current = false;
      return;
    }

    const delayMs = isCorrectAnswer
      ? LEARN_CORRECT_AUTO_ADVANCE_MS
      : LEARN_INCORRECT_AUTO_ADVANCE_MS;

    const timerId = window.setTimeout(() => {
      advanceAfterAnswer();
    }, delayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [selected, isCorrectAnswer]);

  const recordAnswer = (isCorrect: boolean) => {
    if (!currentCard) return;

    if (isCorrect) {
      playCorrectFeedbackSound();
    }

    setLastRoundIndex(study.roundIndex);
    setLastRoundTotal(roundCards.length);
    setLastRoundCorrect(study.correctInRound + (isCorrect ? 1 : 0));
    setIsCorrectAnswer(isCorrect);

    const roundEnded = study.recordRoundAnswer(currentCard.cardId, isCorrect);
    study.recordAnswer(currentCard.cardId, isCorrect);
    setRoundEndedThisStep(roundEnded);
  };

  const handleAnswer = (option: string) => {
    if (!currentCard || selected) {
      return;
    }
    setSelected(option);
    const isCorrect = isMultipleChoice ? option === mcCorrectAnswer : option === currentCard.back;
    if (isCorrect) {
      setFeedback(t('studyUi.feedbackCorrect'));
    } else {
      const correctAnswer = isMultipleChoice ? mcCorrectAnswer : currentCard.back;
      setFeedback(t('studyUi.incorrectWithAnswer', { answer: correctAnswer }));
    }
    recordAnswer(isCorrect);
  };

  const handleWrittenAnswer = () => {
    if (!currentCard || selected || !answer.trim()) {
      return;
    }
    setSelected(answer);
    const isCorrect = fuzzyMatch(answer, currentCard.back);
    if (isCorrect) {
      setFeedback(t('studyUi.feedbackCorrect'));
    } else {
      const correctAnswer = currentCard.back;
      setFeedback(t('studyUi.incorrectWithAnswer', { answer: correctAnswer }));
    }
    recordAnswer(isCorrect);
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

  return (
    <StudyModeShell
      setId={setId}
      modeLabel={t(STUDY_MODE_LABEL_KEY.LEARN)}
      progress={{
        ...studyProgressWhileFeedback(
          roundEndedThisStep,
          lastRoundTotal,
          study.currentIndex,
          roundCards.length
        ),
        label: t('study.progressLearn'),
      }}
    >
      <div className="glass-panel space-y-6 rounded-xl border border-border/50 p-6 shadow-sm md:p-8">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>
              {isMultipleChoice
                ? learnMcq?.embedded
                  ? t('studyUi.promptPickAnswer')
                  : mcDirection === 'back_to_front'
                    ? t('studyUi.promptPickTerm')
                    : t('studyUi.promptPickAnswerForQuestion')
                : t('studyUi.promptTypeAnswer')}
            </span>
          </div>
          <h2 className="text-xl font-bold leading-relaxed md:text-2xl">
            {isMultipleChoice ? mcPrompt : currentCard.front}
          </h2>
          {isMultipleChoice && (
            <button
              type="button"
              onClick={() => speakStudyText(mcPrompt)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80"
            >
              <Volume2 className="h-4 w-4" />
              {learnMcq?.embedded
                ? t('studyUi.listenQuestion')
                : mcDirection === 'back_to_front'
                  ? t('studyUi.listenDefinition')
                  : t('studyUi.listenQuestion')}
            </button>
          )}
        </div>

        {isMultipleChoice ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {options.map((option, index) => {
              const isSelected = selected === option;
              const isCorrectOption = option === mcCorrectAnswer;
              let optionClass =
                'border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5';

              if (selected) {
                if (isCorrectOption) {
                  optionClass =
                    'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
                } else if (isSelected) {
                  optionClass = 'border-destructive/40 bg-destructive/10 text-destructive';
                } else {
                  optionClass = 'border-border/40 bg-muted/30 text-muted-foreground opacity-60';
                }
              }

              return (
                <button
                  key={`${index}-${option}`}
                  type="button"
                  disabled={Boolean(selected)}
                  onClick={() => void handleAnswer(option)}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-4 text-left text-sm font-semibold transition-all',
                    optionClass
                  )}
                >
                  <span>{option}</span>
                  {selected && isCorrectOption && <Check className="h-4 w-4 shrink-0" />}
                  {selected && isSelected && !isCorrectOption && <X className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
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
              placeholder={t('studyUi.answerPlaceholder')}
              rows={3}
              disabled={Boolean(selected)}
            />
            {!selected && (
              <Button
                className="w-full"
                onClick={() => void handleWrittenAnswer()}
                disabled={!answer.trim()}
              >
                {t('studyUi.checkAnswer')}
              </Button>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div
          className={cn(
            'flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between',
            isCorrectAnswer
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'rounded-full p-2',
                isCorrectAnswer ? 'bg-emerald-500/15' : 'bg-destructive/15'
              )}
            >
              {isCorrectAnswer ? (
                <Check className="h-5 w-5 text-emerald-600" />
              ) : (
                <X className="h-5 w-5 text-destructive" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold">
                {isCorrectAnswer ? t('studyUi.greatExact') : t('studyUi.reviewThis')}
              </h4>
              {feedback && <p className="mt-0.5 text-xs font-semibold opacity-90">{feedback}</p>}
            </div>
          </div>
          <Button type="button" className="shrink-0 font-bold" onClick={advanceAfterAnswer}>
            {t(studyContinueKey(roundEndedThisStep))}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </StudyModeShell>
  );
}
