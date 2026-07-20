'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronRight, Edit3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { fuzzyMatch } from '@/lib/utils/fuzzy';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { StudySessionError } from '@/features/study/components/shared/StudySessionError';
import { StudyModeShell } from '@/features/study/components/shared/StudyModeShell';
import { StudyCardText } from '@/features/study/components/shared/StudyCardText';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import {
  studyContinueLabel,
  studyProgressWhileFeedback,
} from '@/features/study/lib/study-continue-label';
import type { StudyCard } from '@/features/study/store';
import { cn } from '@/lib/utils';

type WriteModeProps = {
  setId: string;
};

export function WriteMode({ setId }: WriteModeProps) {
  const study = useStudySession(setId, 'WRITE');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
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
      setIsCorrectAnswer(null);
      setRoundEndedThisStep(false);
      return;
    }

    study.nextCard();
    setAnswer('');
    setFeedback(null);
    setSubmitted(false);
    setIsCorrectAnswer(null);
  };

  const handleSubmit = () => {
    if (!currentCard || submitted) {
      return;
    }
    const isCorrect = fuzzyMatch(answer, currentCard.back);
    setSubmitted(true);
    setIsCorrectAnswer(isCorrect);
    if (isCorrect) {
      setFeedback('Chính xác!');
    } else {
      setFeedback(`Chưa đúng. Đáp án: ${currentCard.back}`);
    }

    setLastRoundIndex(study.roundIndex);
    setLastRoundTotal(roundCards.length);
    setLastRoundCorrect(study.correctInRound + (isCorrect ? 1 : 0));

    const roundEnded = study.recordRoundAnswer(currentCard.cardId, isCorrect);
    study.recordAnswer(currentCard.cardId, isCorrect);

    setRoundEndedThisStep(roundEnded);
  };

  if (study.isLoading) {
    return (
      <div className="glass-panel mx-auto max-w-xl animate-pulse rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Đang khởi tạo phiên học…
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
    <StudyModeShell
      setId={setId}
      modeLabel="Gõ đáp án"
      progress={{
        ...studyProgressWhileFeedback(
          roundEndedThisStep,
          lastRoundTotal,
          study.currentIndex,
          roundCards.length
        ),
        label: 'Tiến trình viết',
      }}
    >
      <div className="glass-panel rounded-xl border border-border/50 p-6 text-center shadow-sm md:p-8">
        <div className="mb-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Edit3 className="h-3.5 w-3.5 text-amber-500" />
          <span>Gõ đáp án cho thuật ngữ sau</span>
        </div>
        <StudyCardText text={currentCard.front} side="front" className="md:text-3xl" />
      </div>

      <Textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !submitted) {
            event.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder="Nhập câu trả lời của bạn…"
        rows={4}
        disabled={submitted}
        className="rounded-2xl border-border/60 bg-background/80 text-base"
      />

      {!submitted ? (
        <Button
          className="w-full rounded-xl font-bold"
          onClick={() => void handleSubmit()}
          disabled={!answer.trim()}
        >
          Kiểm tra đáp án
        </Button>
      ) : (
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
                {isCorrectAnswer ? 'Tuyệt vời!' : 'Chưa chính xác.'}
              </h4>
              {feedback && <p className="mt-0.5 text-xs font-semibold opacity-90">{feedback}</p>}
            </div>
          </div>
          <Button type="button" className="shrink-0 font-bold" onClick={finishIfLast}>
            {studyContinueLabel(roundEndedThisStep)}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </StudyModeShell>
  );
}
