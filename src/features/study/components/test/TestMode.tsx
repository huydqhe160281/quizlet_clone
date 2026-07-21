'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronRight, FileCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fuzzyMatch } from '@/lib/utils/fuzzy';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { StudySessionError } from '@/features/study/components/shared/StudySessionError';
import { StudyModeShell } from '@/features/study/components/shared/StudyModeShell';
import { StudyCardText } from '@/features/study/components/shared/StudyCardText';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import { generateTestQuestions, type TestQuestion } from '@/features/study/lib/test-generator';
import {
  STUDY_CONTINUE_NEXT_QUESTION_KEY,
  studyContinueKey,
  studyProgressWhileFeedback,
} from '@/features/study/lib/study-continue-label';
import type { StudyCard } from '@/features/study/store';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { STUDY_MODE_LABEL_KEY } from '@/features/study/lib/study-mode-i18n';

type TestModeProps = {
  setId: string;
};

const QUESTION_TYPE_KEYS: Record<TestQuestion['type'], string> = {
  mc: 'studyUi.questionMc',
  tf: 'studyUi.questionTf',
  typing: 'studyUi.questionTyping',
};

export function TestMode({ setId }: TestModeProps) {
  const t = useTranslations();
  const study = useStudySession(setId, 'TEST');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [typingAnswer, setTypingAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState<boolean | null>(null);

  const [showSummary, setShowSummary] = useState(false);
  const [roundEndedThisStep, setRoundEndedThisStep] = useState(false);
  const [lastRoundIndex, setLastRoundIndex] = useState(0);
  const [lastRoundCorrect, setLastRoundCorrect] = useState(0);
  const [lastRoundTotal, setLastRoundTotal] = useState(0);

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
      setIsCorrectAnswer(null);
      setRoundEndedThisStep(false);
      return;
    }

    setQuestionIndex((value) => value + 1);
    setFeedback(null);
    setTypingAnswer('');
    setAnswered(false);
    setIsCorrectAnswer(null);
  };

  const recordResult = (cardId: string, isCorrect: boolean, message: string) => {
    setLastRoundIndex(study.roundIndex);
    setLastRoundTotal(roundCards.length);
    setLastRoundCorrect(study.correctInRound + (isCorrect ? 1 : 0));
    setIsCorrectAnswer(isCorrect);
    setFeedback(message);

    const roundEnded = study.recordRoundAnswer(cardId, isCorrect);
    study.recordAnswer(cardId, isCorrect);

    setRoundEndedThisStep(roundEnded);
    setAnswered(true);
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
    <StudyModeShell
      setId={setId}
      modeLabel={t(STUDY_MODE_LABEL_KEY.TEST)}
      progress={{
        ...studyProgressWhileFeedback(
          roundEndedThisStep,
          lastRoundTotal,
          questionIndex,
          questions.length
        ),
        label: t('study.progressTest'),
      }}
    >
      <div className="glass-panel rounded-xl border border-border/50 p-6 shadow-sm md:p-8">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <FileCheck className="h-3.5 w-3.5 text-rose-500" />
          <span>{t(QUESTION_TYPE_KEYS[currentQuestion.type])}</span>
        </div>
        <StudyCardText text={currentQuestion.front} side="front" className="md:text-2xl" />
      </div>

      {currentQuestion.type === 'mc' && (
        <div className="grid gap-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={`${index}-${option}`}
              type="button"
              disabled={answered}
              onClick={() => {
                const isCorrect = option === currentQuestion.correctBack;
                const correctAnswer = currentQuestion.correctBack;
                recordResult(
                  currentQuestion.cardId,
                  isCorrect,
                  isCorrect
                    ? t('studyUi.feedbackCorrect')
                    : t('studyUi.incorrectWithAnswer', { answer: correctAnswer })
                );
              }}
              className={cn(
                'rounded-xl border border-border/60 bg-background p-4 text-left text-sm font-semibold transition-all hover:border-primary/30 hover:bg-primary/5 disabled:opacity-70',
                answered &&
                  option === currentQuestion.correctBack &&
                  'border-emerald-500/40 bg-emerald-500/10'
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {currentQuestion.type === 'tf' && (
        <div className="space-y-4">
          <p className="rounded-2xl bg-muted/50 p-4 text-center text-lg font-medium">
            {currentQuestion.shownBack}
          </p>
          <p className="text-center text-sm text-muted-foreground">{t('studyUi.tfPrompt')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              disabled={answered}
              className="rounded-xl font-bold"
              onClick={() => {
                const isCorrect = currentQuestion.isPairCorrect;
                recordResult(
                  currentQuestion.cardId,
                  isCorrect,
                  isCorrect ? t('studyUi.feedbackCorrect') : t('studyUi.incorrectPair')
                );
              }}
            >
              {t('studyUi.true')}
            </Button>
            <Button
              variant="outline"
              disabled={answered}
              className="rounded-xl font-bold"
              onClick={() => {
                const isCorrect = !currentQuestion.isPairCorrect;
                recordResult(
                  currentQuestion.cardId,
                  isCorrect,
                  isCorrect ? t('studyUi.feedbackCorrect') : t('studyUi.incorrectPair')
                );
              }}
            >
              {t('studyUi.false')}
            </Button>
          </div>
        </div>
      )}

      {currentQuestion.type === 'typing' && (
        <div className="space-y-3">
          <Input
            value={typingAnswer}
            onChange={(event) => setTypingAnswer(event.target.value)}
            placeholder={t('studyUi.answerPlaceholder')}
            disabled={answered}
            className="rounded-xl"
          />
          {!answered ? (
            <Button
              className="w-full rounded-xl font-bold"
              disabled={!typingAnswer.trim()}
              onClick={() => {
                const isCorrect = fuzzyMatch(typingAnswer, currentQuestion.back);
                const correctAnswer = currentQuestion.back;
                recordResult(
                  currentQuestion.cardId,
                  isCorrect,
                  isCorrect
                    ? t('studyUi.feedbackCorrect')
                    : t('studyUi.incorrectWithAnswer', { answer: correctAnswer })
                );
              }}
            >
              {t('studyUi.submit')}
            </Button>
          ) : null}
        </div>
      )}

      {answered && (
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
                {isCorrectAnswer ? t('studyUi.great') : t('studyUi.reviewThis')}
              </h4>
              {feedback && <p className="mt-0.5 text-xs font-semibold opacity-90">{feedback}</p>}
            </div>
          </div>
          <Button type="button" className="shrink-0 font-bold" onClick={goNext}>
            {t(studyContinueKey(roundEndedThisStep, STUDY_CONTINUE_NEXT_QUESTION_KEY))}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </StudyModeShell>
  );
}
