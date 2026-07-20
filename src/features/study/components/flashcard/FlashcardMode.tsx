'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Layers,
  Pause,
  Play,
  Shuffle,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FlashcardViewer,
  speakStudyText,
  useFlipState,
} from '@/features/study/components/flashcard/FlashcardViewer';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { StudySessionError } from '@/features/study/components/shared/StudySessionError';
import { StudyModeShell } from '@/features/study/components/shared/StudyModeShell';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import type { StudyCard } from '@/features/study/store';
import { cn } from '@/lib/utils';

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
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const roundCards = useMemo(() => {
    if (!study.currentRound) return [];
    return study.currentRound
      .map((id) => study.cards.find((c) => c.cardId === id))
      .filter((c): c is StudyCard => !!c);
  }, [study.currentRound, study.cards]);

  const currentCard = roundCards[study.currentIndex];
  const isLastCard = study.currentIndex >= roundCards.length - 1;

  const goNext = useCallback(async () => {
    if (!currentCard) return;
    resetFlip();

    setLastRoundIndex(study.roundIndex);
    setLastRoundSize(roundCards.length);

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

  useEffect(() => {
    if (!speechEnabled || !currentCard || isFlipped) {
      return;
    }
    speakStudyText(currentCard.front, 'en-US');
  }, [currentCard?.cardId, speechEnabled, isFlipped, currentCard]);

  useEffect(() => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
    }

    if (!autoplay || !currentCard) {
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      if (!isFlipped) {
        flip();
        if (speechEnabled) {
          speakStudyText(currentCard.back);
        }
      } else {
        void goNext();
      }
    }, 4000);

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [autoplay, currentCard, isFlipped, flip, goNext, speechEnabled]);

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
    return <p className="text-sm text-muted-foreground">Không có thẻ trong bộ này.</p>;
  }

  return (
    <StudyModeShell
      setId={setId}
      modeLabel="Chế độ thẻ ghi nhớ"
      progress={{
        current: study.currentIndex + 1,
        total: roundCards.length,
        label: 'Tiến trình',
      }}
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Vòng {study.roundIndex + 1}
        </span>
      }
    >
      <div
        className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 p-4 text-xs"
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={speechEnabled ? 'default' : 'outline'}
            size="sm"
            className="rounded-lg text-xs font-bold"
            onClick={() => setSpeechEnabled((value) => !value)}
          >
            <Volume2 className="mr-1.5 h-3.5 w-3.5" />
            Phát âm: {speechEnabled ? 'Bật' : 'Tắt'}
          </Button>
          <Button
            type="button"
            variant={autoplay ? 'default' : 'outline'}
            size="sm"
            className="rounded-lg text-xs font-bold"
            onClick={() => setAutoplay((value) => !value)}
          >
            {autoplay ? (
              <Pause className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Play className="mr-1.5 h-3.5 w-3.5" />
            )}
            Tự chạy: {autoplay ? 'Đang chạy' : 'Dừng'}
          </Button>
        </div>
        {study.settings?.randomize && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground">
            <Shuffle className="h-3.5 w-3.5" />
            Thứ tự đã xáo trộn
          </span>
        )}
      </div>

      <FlashcardViewer
        front={currentCard.front}
        back={currentCard.back}
        example={currentCard.example}
        imageUrl={currentCard.imageUrl}
        isFlipped={isFlipped}
        onFlip={flip}
        speechEnabled={speechEnabled}
        onSpeakFront={() => speakStudyText(currentCard.front, 'en-US')}
        onSpeakBack={() => speakStudyText(currentCard.back)}
      />

      <div className="flex items-center justify-center gap-6">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full shadow-sm"
          onClick={goPrev}
          disabled={study.currentIndex === 0}
          aria-label="Thẻ trước"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <span className="rounded-full bg-muted px-4 py-1.5 text-sm font-bold">
          {study.currentIndex + 1} / {roundCards.length}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full shadow-sm"
          onClick={() => void goNext()}
          aria-label="Thẻ tiếp theo"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      <p className="text-center text-[11px] font-semibold text-muted-foreground">
        Mẹo: dùng phím{' '}
        <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">←</kbd>{' '}
        <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">→</kbd> hoặc vuốt
        để chuyển thẻ
      </p>

      {isLastCard && isFlipped && (
        <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground shadow-lg md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-primary-foreground/15 p-2.5">
              <Award className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-base font-bold">Bạn đã xem hết thẻ trong vòng này!</h3>
              <p className="mt-0.5 text-xs text-primary-foreground/80">
                Bấm tiếp để sang vòng sau, hoặc học hết các vòng để lưu phiên trên Dashboard.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className={cn('shrink-0 font-extrabold')}
            onClick={() => void goNext()}
          >
            {study.currentIndex >= roundCards.length - 1 ? 'Vòng tiếp theo' : 'Tiếp tục'}
          </Button>
        </div>
      )}

      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => void goNext()}
        >
          <Layers className="mr-2 h-4 w-4" />
          {study.currentIndex >= roundCards.length - 1 ? 'Vòng tiếp theo' : 'Thẻ tiếp theo'}
        </Button>
      </div>
    </StudyModeShell>
  );
}
