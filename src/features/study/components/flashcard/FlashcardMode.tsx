'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Pause, Play, Shuffle, Sparkles, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FlashcardViewer,
  speakStudyText,
  useFlipState,
} from '@/features/study/components/flashcard/FlashcardViewer';
import {
  SwipeableCard,
  type SwipeDirection,
} from '@/features/study/components/flashcard/SwipeableCard';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { StudySessionError } from '@/features/study/components/shared/StudySessionError';
import { StudyModeShell } from '@/features/study/components/shared/StudyModeShell';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import { hasKana } from '@/features/study/lib/speech-lang';
import { playAnswerFeedback } from '@/features/study/lib/answer-feedback';
import { useStudyStore } from '@/features/study/store';
import type { StudyCard } from '@/features/study/store';
import { isTextEntryElement } from '@/lib/utils/touch';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { STUDY_MODE_LABEL_KEY } from '@/features/study/lib/study-mode-i18n';

type FlashcardModeProps = {
  setId: string;
};

export function FlashcardMode({ setId }: FlashcardModeProps) {
  const t = useTranslations();
  const study = useStudySession(setId, 'FLASHCARD');
  const { isFlipped, flip, resetFlip } = useFlipState();
  const [showSummary, setShowSummary] = useState(false);
  const [lastRoundIndex, setLastRoundIndex] = useState(0);
  const [lastRoundSize, setLastRoundSize] = useState(0);
  const [lastRoundKnown, setLastRoundKnown] = useState(0);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Key of the last answered card: a swipe whose fly-out finishes after a key/button
  // already answered that card must not record it again (and skip the next one).
  const answeredKeyRef = useRef<string | null>(null);

  const roundCards = useMemo(() => {
    if (!study.currentRound) return [];
    return study.currentRound
      .map((id) => study.cards.find((c) => c.cardId === id))
      .filter((c): c is StudyCard => !!c);
  }, [study.currentRound, study.cards]);

  const currentCard = roundCards[study.currentIndex];
  const speechHints = useMemo(
    () => ({ japanese: study.cards.some((card) => hasKana(`${card.front}${card.back}`)) }),
    [study.cards]
  );

  /**
   * Records the current card as known (swipe right / → / "Know it") or still
   * learning (swipe left / ← / "Still learning"). Still-learning cards come back
   * in a later round via the round engine's remediation queue.
   *
   * `passive` (autoplay) moves past the card without grading it: no sound, no
   * requeue, and nothing sent to the server, so autoplay never inflates the score.
   */
  const answer = useCallback(
    async (isKnown: boolean, { passive = false }: { passive?: boolean } = {}) => {
      if (!currentCard) return;
      const answerKey = `${study.sessionId}:${study.roundIndex}:${study.currentIndex}:${currentCard.cardId}`;
      if (answeredKeyRef.current === answerKey) return;
      answeredKeyRef.current = answerKey;

      const countsAsKnown = isKnown && !passive;
      if (!passive) {
        playAnswerFeedback(isKnown);
      }
      resetFlip();

      setLastRoundIndex(study.roundIndex);
      setLastRoundSize(roundCards.length);
      setLastRoundKnown(study.correctInRound + (countsAsKnown ? 1 : 0));

      const roundEnded = study.recordRoundAnswer(currentCard.cardId, isKnown || passive, {
        countAsCorrect: countsAsKnown,
      });
      if (!passive) {
        study.recordAnswer(currentCard.cardId, isKnown);
      }

      if (roundEnded) {
        // recordRoundAnswer updated the store synchronously; `study` is this render's
        // snapshot, so read completion from the store or the final round never completes.
        if (useStudyStore.getState().isComplete) {
          await study.completeSession(study.reviewedCount + 1);
        } else {
          setShowSummary(true);
        }
      } else {
        study.nextCard();
      }
    },
    [currentCard, study, roundCards.length, resetFlip]
  );

  const handleSwipe = useCallback(
    (direction: SwipeDirection) => void answer(direction === 'right'),
    [answer]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (study.isComplete || showSummary || !currentCard || event.repeat) {
        return;
      }
      // Keys typed into a field (e.g. the guide chat) belong to that field.
      if (event.target instanceof Element && isTextEntryElement(event.target)) {
        return;
      }

      if (event.code === 'Space') {
        // preventDefault also stops Space from re-clicking a focused button such as
        // "Know it", which would grade the next card instead of flipping it.
        event.preventDefault();
        flip();
      }
      if (event.code === 'ArrowRight') {
        event.preventDefault();
        void answer(true);
      }
      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        void answer(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [study.isComplete, showSummary, currentCard, flip, answer]);

  useEffect(() => {
    if (!speechEnabled || !currentCard || isFlipped) {
      return;
    }
    speakStudyText(currentCard.front, undefined, speechHints);
  }, [currentCard?.cardId, speechEnabled, isFlipped, currentCard, speechHints]);

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
          speakStudyText(currentCard.back, undefined, speechHints);
        }
      } else {
        void answer(true, { passive: true });
      }
    }, 4000);

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [autoplay, currentCard, isFlipped, flip, answer, speechEnabled, speechHints]);

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
        correctCount={lastRoundKnown}
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
    return <p className="text-sm text-muted-foreground">{t('studyUi.emptyCards')}</p>;
  }

  return (
    <StudyModeShell
      setId={setId}
      modeLabel={t(STUDY_MODE_LABEL_KEY.FLASHCARD)}
      progress={{
        current: study.currentIndex + 1,
        total: roundCards.length,
        label: t('study.progressDefault'),
      }}
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {t('studyUi.roundBadge', { round: study.roundIndex + 1 })}
        </span>
      }
    >
      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 p-4 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={speechEnabled ? 'default' : 'outline'}
            size="sm"
            className="rounded-lg text-xs font-bold"
            onClick={() => setSpeechEnabled((value) => !value)}
          >
            <Volume2 className="mr-1.5 h-3.5 w-3.5" />
            {speechEnabled ? t('studyUi.speechOn') : t('studyUi.speechOff')}
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
            {autoplay ? t('studyUi.autoplayRunning') : t('studyUi.autoplayPaused')}
          </Button>
        </div>
        {study.settings?.randomize && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground">
            <Shuffle className="h-3.5 w-3.5" />
            {t('studyUi.shuffledOrder')}
          </span>
        )}
      </div>

      <SwipeableCard key={`${study.roundIndex}-${currentCard.cardId}`} onSwipe={handleSwipe}>
        {({ guardClick }) => (
          <FlashcardViewer
            front={currentCard.front}
            back={currentCard.back}
            example={currentCard.example}
            imageUrl={currentCard.imageUrl}
            isFlipped={isFlipped}
            onFlip={guardClick(flip)}
            speechEnabled={speechEnabled}
            onSpeakFront={() => speakStudyText(currentCard.front, undefined, speechHints)}
            onSpeakBack={() => speakStudyText(currentCard.back, undefined, speechHints)}
          />
        )}
      </SwipeableCard>

      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 rounded-full border-destructive/40 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive sm:max-w-48"
          onClick={() => void answer(false)}
        >
          <X className="mr-1.5 h-5 w-5" />
          {t('studyUi.stillLearning')}
        </Button>
        <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-sm font-bold">
          {study.currentIndex + 1} / {roundCards.length}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 rounded-full border-emerald-500/40 font-bold text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 sm:max-w-48"
          onClick={() => void answer(true)}
        >
          <Check className="mr-1.5 h-5 w-5" />
          {t('studyUi.knowIt')}
        </Button>
      </div>

      <p className="hidden text-center text-[11px] font-semibold text-muted-foreground sm:block">
        {t('studyUi.navTip')}
      </p>
    </StudyModeShell>
  );
}
