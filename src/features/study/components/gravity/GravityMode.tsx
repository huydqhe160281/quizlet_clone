'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RoundSummary } from '@/features/study/components/shared/RoundSummary';
import { SessionComplete } from '@/features/study/components/shared/SessionComplete';
import { StudySessionError } from '@/features/study/components/shared/StudySessionError';
import { GravityControls } from '@/features/study/components/gravity/GravityControls';
import { GravityHud } from '@/features/study/components/gravity/GravityHud';
import { GravityMeteorView } from '@/features/study/components/gravity/GravityMeteorView';
import {
  GravityGameOverOverlay,
  GravityPausedOverlay,
} from '@/features/study/components/gravity/GravityOverlays';
import {
  GravityLasers,
  GravityPoppedEffects,
  GravitySpaceship,
  GravityStarfield,
  LASER_SHOT_DURATION_MS,
  pickRandomShipSkin,
  type GravityLaserShot,
} from '@/features/study/components/gravity/GravityScenery';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import {
  analyzeTypedAnswer,
  calculateMeteorScore,
  computeFallDurationMs,
  findMatchingMeteor,
  getMeteorProgress,
  GRAVITY_LANES,
  GRAVITY_MAX_CONCURRENT_METEORS,
  GRAVITY_MAX_LIVES,
  GRAVITY_SHIP_Y_PERCENT,
  GRAVITY_SPAWN_INTERVAL_MS,
  laserTargetYPercent,
  normalizeGravityText,
  pickNextLaneIndex,
  resolveCardPromptAndAnswer,
  shipXPercentFor,
  type GravityDirection,
  type GravityFeedbackPill,
  type GravityMeteor,
  type GravityPoppedEffect,
  type GravitySpeedMultiplier,
} from '@/features/study/lib/gravity-engine';
import { guessSpeechLang, hasKana } from '@/features/study/lib/speech-lang';
import {
  playImpactFeedbackSound,
  playLaserChipSound,
  playLaserExplosionSound,
} from '@/features/study/lib/study-feedback-sound';
import { useStudyStore, type StudyCard } from '@/features/study/store';
import { StudyOfflineSyncStatus } from '@/features/study-offline/StudyOfflineSyncStatus';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import { isCoarsePointer, isTextEntryElement } from '@/lib/utils/touch';

type GravityModeProps = {
  setId: string;
};

const POPPED_EFFECT_DURATION_MS = 1150;
const IMPACT_PLANET_Y_PERCENT = 76;
const ARENA_MIN_HEIGHT_PX = 320;
const ARENA_BOTTOM_GAP_PX = 12;

function closestToImpact(meteors: GravityMeteor[], nowMs: number): GravityMeteor | undefined {
  let best: GravityMeteor | undefined;
  let bestProgress = -1;
  for (const meteor of meteors) {
    const progress = getMeteorProgress(meteor, nowMs);
    if (progress > bestProgress) {
      bestProgress = progress;
      best = meteor;
    }
  }
  return best;
}

/**
 * Fits the arena into the space left below its top edge, and shrinks it while the
 * on-screen keyboard is open (`visualViewport` resizes, `100dvh` does not).
 */
function useArenaHeight(el: HTMLElement | null): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!el) return;
    const update = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(
        Math.max(ARENA_MIN_HEIGHT_PX, Math.round(viewportHeight - top - ARENA_BOTTOM_GAP_PX))
      );
    };
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, [el]);

  return height;
}

export function GravityMode({ setId }: GravityModeProps) {
  const t = useTranslations();
  const study = useStudySession(setId, 'GRAVITY');
  const { recordAnswer, recordRoundAnswer, completeSession } = study;

  const [direction, setDirection] = useState<GravityDirection>('back_to_front');
  const [speedMultiplier, setSpeedMultiplier] = useState<GravitySpeedMultiplier>(1);
  const [shipSkin, setShipSkin] = useState<number>(() => pickRandomShipSkin());
  const [shipShotSeq, setShipShotSeq] = useState<number>(0);
  const [lives, setLives] = useState<number>(GRAVITY_MAX_LIVES);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [destroyedCount, setDestroyedCount] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [showRoundSummary, setShowRoundSummary] = useState<boolean>(false);
  const [lastRoundStats, setLastRoundStats] = useState({
    roundIndex: 0,
    correctCount: 0,
    total: 0,
  });

  const [input, setInput] = useState<string>('');
  const [inputFocused, setInputFocused] = useState<boolean>(false);
  const [isTouch] = useState<boolean>(isCoarsePointer);
  const [inputShake, setInputShake] = useState<boolean>(false);
  const [impactFlash, setImpactFlash] = useState<boolean>(false);
  const [feedbackPill, setFeedbackPill] = useState<GravityFeedbackPill | null>(null);
  const [lockedTargetId, setLockedTargetId] = useState<string | null>(null);

  const [activeMeteors, setActiveMeteors] = useState<GravityMeteor[]>([]);
  /** Keystrokes fired at each meteor; a new value replays its shake animation. */
  const [meteorHits, setMeteorHits] = useState<Record<string, number>>({});
  const [poppedEffects, setPoppedEffects] = useState<GravityPoppedEffect[]>([]);
  const [laserShots, setLaserShots] = useState<GravityLaserShot[]>([]);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  // State, not a ref: the arena mounts only after the session loads.
  const [arenaEl, setArenaEl] = useState<HTMLDivElement | null>(null);
  const arenaHeight = useArenaHeight(arenaEl);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevInputRef = useRef<string>('');
  const isComposingRef = useRef<boolean>(false);
  const ctrlSoloRef = useRef<boolean>(false);
  const spawnQueueRef = useRef<StudyCard[]>([]);
  const activeMeteorsRef = useRef<GravityMeteor[]>([]);
  /**
   * Per round (kept across replays, game overs and direction changes): the answer recorded
   * for each card — its first destroy — and the cards hinted or let through. Replaying a
   * wave must not turn a miss into a clean answer.
   */
  const outcomesRoundRef = useRef<string | null>(null);
  const recordedOutcomesRef = useRef<Map<string, boolean>>(new Map());
  const slippedCardIdsRef = useRef<Set<string>>(new Set());
  const elapsedMsRef = useRef<number>(0);
  const shotSeqRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastSpawnAtMsRef = useRef<number>(-GRAVITY_SPAWN_INTERVAL_MS);
  const spawnCounterRef = useRef<number>(0);
  const livesRef = useRef<number>(GRAVITY_MAX_LIVES);
  const comboRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const destroyedCountRef = useRef<number>(0);
  const waveStartScoreRef = useRef<number>(0);
  const waveStartDestroyedRef = useRef<number>(0);
  const roundIndexRef = useRef<number>(0);
  const speedMultiplierRef = useRef<GravitySpeedMultiplier>(1);
  const lockedTargetIdRef = useRef<string | null>(null);
  const impactTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);

  const updateLockedTargetId = useCallback((nextId: string | null) => {
    lockedTargetIdRef.current = nextId;
    setLockedTargetId(nextId);
  }, []);

  const roundCards = useMemo(() => {
    if (!study.currentRound) return [];
    return study.currentRound
      .map((id) => study.cards.find((c) => c.cardId === id))
      .filter((c): c is StudyCard => !!c);
  }, [study.currentRound, study.cards]);

  const roundSignature = useMemo(
    () => `${study.roundIndex}:${roundCards.map((c) => c.cardId).join(',')}`,
    [study.roundIndex, roundCards]
  );

  const sessionHasKana = useMemo(
    () => study.cards.some((card) => hasKana(card.front) || hasKana(card.back)),
    [study.cards]
  );

  const speakText = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(trimmed);
        utterance.lang = guessSpeechLang(trimmed, { japanese: sessionHasKana });
        window.speechSynthesis.speak(utterance);
      } catch {
        // Speech synthesis unavailable — ignore
      }
    },
    [sessionHasKana]
  );

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const focusInputIfDesktop = useCallback(() => {
    if (!isCoarsePointer()) {
      inputRef.current?.focus();
    }
  }, []);

  const spawnMeteor = useCallback(
    (nowMs: number, currentActive: GravityMeteor[]): GravityMeteor[] => {
      const nextCard = spawnQueueRef.current.shift();
      if (!nextCard) return currentActive;

      spawnCounterRef.current += 1;
      const laneIndex = pickNextLaneIndex(currentActive, spawnCounterRef.current);
      const { promptText, answerText, altAnswers } = resolveCardPromptAndAnswer(
        nextCard,
        direction
      );
      const newMeteor: GravityMeteor = {
        id: `meteor-${nextCard.cardId}-${spawnCounterRef.current}`,
        card: nextCard,
        promptText,
        answerText,
        altAnswers,
        laneIndex,
        xPercent: GRAVITY_LANES[laneIndex] ?? 50,
        spawnedAtMs: nowMs,
        durationMs: computeFallDurationMs(
          comboRef.current,
          roundIndexRef.current,
          speedMultiplierRef.current
        ),
        baseDurationMs: computeFallDurationMs(comboRef.current, roundIndexRef.current, 1),
        hinted: false,
      };

      lastSpawnAtMsRef.current = nowMs;
      return [...currentActive, newMeteor];
    },
    [direction]
  );

  const initWave = useCallback(
    (cardsForWave: StudyCard[], resetFullStats = false, randomizeShip = false) => {
      if (outcomesRoundRef.current !== roundSignature) {
        outcomesRoundRef.current = roundSignature;
        recordedOutcomesRef.current = new Map();
        slippedCardIdsRef.current = new Set();
      }
      spawnQueueRef.current = [...cardsForWave];
      activeMeteorsRef.current = [];
      elapsedMsRef.current = 0;
      lastFrameTimeRef.current = null;
      lastSpawnAtMsRef.current = -GRAVITY_SPAWN_INTERVAL_MS;
      roundIndexRef.current = study.roundIndex;

      if (randomizeShip) {
        setShipSkin((prev) => pickRandomShipSkin(prev));
      }

      if (resetFullStats) {
        maxComboRef.current = 0;
        waveStartScoreRef.current = 0;
        waveStartDestroyedRef.current = 0;
        setMaxCombo(0);
        setFeedbackPill(null);
      }
      livesRef.current = GRAVITY_MAX_LIVES;
      comboRef.current = 0;
      scoreRef.current = waveStartScoreRef.current;
      destroyedCountRef.current = waveStartDestroyedRef.current;
      setLives(GRAVITY_MAX_LIVES);
      setCombo(0);
      setScore(waveStartScoreRef.current);
      setDestroyedCount(waveStartDestroyedRef.current);

      setGameOver(false);
      setPaused(false);
      setInput('');
      prevInputRef.current = '';
      updateLockedTargetId(null);
      setShipShotSeq(0);
      setMeteorHits({});
      setPoppedEffects([]);
      setLaserShots([]);
      setElapsedMs(0);

      const seeded = cardsForWave.length > 0 ? spawnMeteor(0, []) : [];
      activeMeteorsRef.current = seeded;
      setActiveMeteors(seeded);
      focusInputIfDesktop();
    },
    [focusInputIfDesktop, roundSignature, spawnMeteor, study.roundIndex, updateLockedTargetId]
  );

  // Start a wave whenever the round or the answer direction changes.
  useEffect(() => {
    if (study.isLoading || study.error || study.isComplete || showRoundSummary) return;
    if (roundCards.length === 0) return;
    initWave(roundCards, study.roundIndex === 0, false);
    // initWave/roundCards change with every round signature; re-running on them would
    // restart a wave in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundSignature, direction, study.isLoading, study.error, study.isComplete, showRoundSummary]);

  /** Records a card's answer the first time it is destroyed this round. */
  const recordFinalOutcome = useCallback(
    (meteor: GravityMeteor) => {
      const { cardId } = meteor.card;
      if (recordedOutcomesRef.current.has(cardId)) return;
      const isClean = !meteor.hinted && !slippedCardIdsRef.current.has(cardId);
      recordedOutcomesRef.current.set(cardId, isClean);
      recordAnswer(cardId, isClean);
    },
    [recordAnswer]
  );

  const commitWaveCompletion = useCallback(() => {
    const roundIdx = study.roundIndex;
    let cleanCorrectCount = 0;
    let roundEnded = false;

    waveStartScoreRef.current = scoreRef.current;
    waveStartDestroyedRef.current = destroyedCountRef.current;

    for (const card of roundCards) {
      const isClean = recordedOutcomesRef.current.get(card.cardId) ?? false;
      if (isClean) cleanCorrectCount += 1;
      roundEnded = recordRoundAnswer(card.cardId, isClean) || roundEnded;
    }

    if (roundEnded) {
      setLastRoundStats({
        roundIndex: roundIdx,
        correctCount: cleanCorrectCount,
        total: roundCards.length,
      });
      if (useStudyStore.getState().isComplete) {
        void completeSession();
      } else {
        setShowRoundSummary(true);
      }
    }
  }, [completeSession, recordRoundAnswer, roundCards, study.roundIndex]);

  const destroyMeteor = useCallback(
    (target: GravityMeteor) => {
      const nowMs = elapsedMsRef.current;
      const nextCombo = target.hinted ? comboRef.current : comboRef.current + 1;
      const earned = calculateMeteorScore(target, nowMs, nextCombo, speedMultiplierRef.current);
      const progress = getMeteorProgress(target, nowMs);

      comboRef.current = nextCombo;
      maxComboRef.current = Math.max(maxComboRef.current, nextCombo);
      scoreRef.current += earned;
      destroyedCountRef.current += 1;
      recordFinalOutcome(target);

      setCombo(nextCombo);
      setMaxCombo(maxComboRef.current);
      setScore(scoreRef.current);
      setDestroyedCount(destroyedCountRef.current);
      setShipShotSeq((s) => s + 1);
      setFeedbackPill({ front: target.card.front, back: target.card.back, kind: 'hit' });
      playLaserExplosionSound();

      shotSeqRef.current += 1;
      setLaserShots((prev) => [
        ...prev,
        {
          id: `laser-kill-${target.id}-${shotSeqRef.current}`,
          fromXPercent: shipXPercentFor(target.xPercent),
          fromYPercent: GRAVITY_SHIP_Y_PERCENT,
          toXPercent: target.xPercent,
          toYPercent: laserTargetYPercent(progress),
          createdAtMs: nowMs,
          kind: 'kill',
        },
      ]);
      setPoppedEffects((prev) => [
        ...prev,
        {
          id: `pop-${target.id}-${nowMs}`,
          text: target.answerText,
          xPercent: target.xPercent,
          yPercent: laserTargetYPercent(progress),
          points: earned,
          createdAtMs: nowMs,
          kind: 'hit',
        },
      ]);

      let remaining = activeMeteorsRef.current.filter((m) => m.id !== target.id);
      if (remaining.length === 0 && spawnQueueRef.current.length > 0) {
        remaining = spawnMeteor(nowMs, remaining);
      }
      activeMeteorsRef.current = remaining;
      setActiveMeteors(remaining);
      setMeteorHits((prev) => {
        if (!(target.id in prev)) return prev;
        const copy = { ...prev };
        delete copy[target.id];
        return copy;
      });
      updateLockedTargetId(null);
      setInput('');
      prevInputRef.current = '';

      if (remaining.length === 0 && spawnQueueRef.current.length === 0) {
        commitWaveCompletion();
      }
    },
    [commitWaveCompletion, recordFinalOutcome, spawnMeteor, updateLockedTargetId]
  );

  // Main animation loop
  useEffect(() => {
    if (
      study.isLoading ||
      study.error ||
      study.isComplete ||
      paused ||
      gameOver ||
      showRoundSummary
    ) {
      lastFrameTimeRef.current = null;
      return;
    }

    let rafId: number;

    const step = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }
      const deltaMs = Math.min(100, Math.max(0, timestamp - lastFrameTimeRef.current));
      lastFrameTimeRef.current = timestamp;

      const nowMs = elapsedMsRef.current + deltaMs;
      elapsedMsRef.current = nowMs;

      // 1. Meteors that reached the planet
      const currentMeteors = activeMeteorsRef.current;
      const impacted: GravityMeteor[] = [];
      const surviving: GravityMeteor[] = [];
      for (const meteor of currentMeteors) {
        (getMeteorProgress(meteor, nowMs) >= 1 ? impacted : surviving).push(meteor);
      }

      let updatedMeteors = surviving;

      if (impacted.length > 0) {
        playImpactFeedbackSound();
        setImpactFlash(true);
        if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current);
        impactTimerRef.current = window.setTimeout(() => setImpactFlash(false), 360);

        comboRef.current = 0;
        setCombo(0);

        const lastImpacted = impacted[impacted.length - 1]!;
        setFeedbackPill({
          front: lastImpacted.card.front,
          back: lastImpacted.card.back,
          kind: 'miss',
        });

        // Clear the typed text only if it was aimed at a meteor that just hit
        const impactedIds = new Set(impacted.map((m) => m.id));
        const currentLockedId = lockedTargetIdRef.current;
        if ((currentLockedId && impactedIds.has(currentLockedId)) || surviving.length === 0) {
          setInput('');
          prevInputRef.current = '';
          updateLockedTargetId(null);
        }

        setMeteorHits((prev) => {
          if (!impacted.some((m) => m.id in prev)) return prev;
          const copy = { ...prev };
          for (const missed of impacted) delete copy[missed.id];
          return copy;
        });

        setPoppedEffects((prev) => [
          ...prev,
          ...impacted.map((missed) => ({
            id: `impact-${missed.id}-${nowMs}`,
            text: missed.answerText,
            xPercent: missed.xPercent,
            yPercent: IMPACT_PLANET_Y_PERCENT,
            points: 0,
            createdAtMs: nowMs,
            kind: 'impact' as const,
          })),
        ]);

        for (const missed of impacted) {
          slippedCardIdsRef.current.add(missed.card.cardId);
        }

        const nextLives = Math.max(0, livesRef.current - impacted.length);
        livesRef.current = nextLives;
        setLives(nextLives);

        if (nextLives <= 0) {
          activeMeteorsRef.current = [];
          setActiveMeteors([]);
          setGameOver(true);
          return;
        }

        // Re-queue impacted cards at the end of the wave so the learner still masters them
        spawnQueueRef.current.push(...impacted.map((missed) => missed.card));
      }

      // 2. Spawn (interval scales inversely with the speed multiplier)
      const shouldSpawnImmediate = updatedMeteors.length === 0 && spawnQueueRef.current.length > 0;
      const shouldSpawnInterval =
        updatedMeteors.length < GRAVITY_MAX_CONCURRENT_METEORS &&
        spawnQueueRef.current.length > 0 &&
        nowMs - lastSpawnAtMsRef.current >= GRAVITY_SPAWN_INTERVAL_MS / speedMultiplierRef.current;

      if (shouldSpawnImmediate || shouldSpawnInterval) {
        updatedMeteors = spawnMeteor(nowMs, updatedMeteors);
      }

      if (updatedMeteors !== currentMeteors) {
        activeMeteorsRef.current = updatedMeteors;
        setActiveMeteors(updatedMeteors);
      }

      // 3. Drop expired effects (returning `prev` when nothing expired skips a re-render)
      setPoppedEffects((prev) =>
        prev.some((item) => nowMs - item.createdAtMs >= POPPED_EFFECT_DURATION_MS)
          ? prev.filter((item) => nowMs - item.createdAtMs < POPPED_EFFECT_DURATION_MS)
          : prev
      );
      setLaserShots((prev) =>
        prev.some((shot) => nowMs - shot.createdAtMs >= LASER_SHOT_DURATION_MS)
          ? prev.filter((shot) => nowMs - shot.createdAtMs < LASER_SHOT_DURATION_MS)
          : prev
      );

      setElapsedMs(nowMs);
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [
    gameOver,
    paused,
    showRoundSummary,
    spawnMeteor,
    study.error,
    study.isComplete,
    study.isLoading,
    updateLockedTargetId,
  ]);

  /**
   * Changes the speed & score multiplier. Each active meteor keeps its current height
   * (`progress`) while its remaining fall time is rescaled to the new speed.
   */
  const handleSelectSpeed = useCallback(
    (nextSpeed: GravitySpeedMultiplier) => {
      if (nextSpeed !== speedMultiplierRef.current) {
        speedMultiplierRef.current = nextSpeed;
        setSpeedMultiplier(nextSpeed);

        const nowMs = elapsedMsRef.current;
        const current = activeMeteorsRef.current;
        if (current.length > 0) {
          const rescaled = current.map((meteor) => {
            const progress = getMeteorProgress(meteor, nowMs);
            const durationMs = Math.max(1000, Math.round(meteor.baseDurationMs / nextSpeed));
            return { ...meteor, durationMs, spawnedAtMs: nowMs - progress * durationMs };
          });
          activeMeteorsRef.current = rescaled;
          setActiveMeteors(rescaled);
        }
      }
      focusInputIfDesktop();
    },
    [focusInputIfDesktop]
  );

  /**
   * Each typed character fires a chip laser at the targeted meteor and shakes it; the
   * typed letters show inside its card. Enter fires the final shot (`destroyMeteor`).
   */
  const handleInputChange = (value: string) => {
    const prevValue = prevInputRef.current;
    prevInputRef.current = value;
    setInput(value);

    if (value === prevValue) return;

    const currentMeteors = activeMeteorsRef.current;
    if (currentMeteors.length === 0) return;

    if (!normalizeGravityText(value)) {
      updateLockedTargetId(null);
      return;
    }

    const nowMs = elapsedMsRef.current;

    // Aim at the meteor this answers, else one whose answer it starts, else keep the lock
    const onTrack = currentMeteors.filter((m) => {
      const { status } = analyzeTypedAnswer(value, m);
      return status === 'primed' || status === 'matching';
    });
    const targetMeteor =
      findMatchingMeteor(currentMeteors, value, nowMs) ??
      closestToImpact(onTrack, nowMs) ??
      currentMeteors.find((m) => m.id === lockedTargetIdRef.current) ??
      closestToImpact(currentMeteors, nowMs);

    if (!targetMeteor) return;
    updateLockedTargetId(targetMeteor.id);

    // Fire on added characters and on Telex/IME rewrites (same length, different text), not on Backspace
    const didTypeCharacter =
      value.length > prevValue.length ||
      (value.length === prevValue.length && value.trim() !== prevValue.trim());
    if (!didTypeCharacter) return;

    playLaserChipSound();
    setShipShotSeq((s) => s + 1);

    const jitterX = ((shotSeqRef.current % 3) - 1) * 0.9;
    const wingCannonOffset = shotSeqRef.current % 2 === 0 ? -1.4 : 1.4;
    shotSeqRef.current += 1;

    setLaserShots((prev) => [
      ...prev.slice(-6),
      {
        id: `laser-chip-${targetMeteor.id}-${shotSeqRef.current}`,
        fromXPercent: shipXPercentFor(targetMeteor.xPercent) + wingCannonOffset,
        fromYPercent: GRAVITY_SHIP_Y_PERCENT,
        toXPercent: targetMeteor.xPercent + jitterX,
        toYPercent: laserTargetYPercent(getMeteorProgress(targetMeteor, nowMs)),
        createdAtMs: nowMs,
        kind: 'chip',
      },
    ]);
    setMeteorHits((prev) => ({ ...prev, [targetMeteor.id]: (prev[targetMeteor.id] ?? 0) + 1 }));
  };

  const handleFireSubmit = () => {
    if (!input.trim()) return;
    const matched = findMatchingMeteor(activeMeteorsRef.current, input, elapsedMsRef.current);
    if (matched) {
      destroyMeteor(matched);
    } else {
      playImpactFeedbackSound();
      setInputShake(true);
      if (shakeTimerRef.current !== null) window.clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = window.setTimeout(() => setInputShake(false), 360);
    }
  };

  const lockedOrLowestMeteor = useCallback((): GravityMeteor | undefined => {
    const current = activeMeteorsRef.current;
    return (
      current.find((m) => m.id === lockedTargetIdRef.current) ??
      closestToImpact(current, elapsedMsRef.current)
    );
  }, []);

  const handleHint = useCallback(() => {
    if (paused || gameOver || showRoundSummary || study.isComplete) return;
    const target = lockedOrLowestMeteor();
    if (!target) return;

    slippedCardIdsRef.current.add(target.card.cardId);
    const updated = activeMeteorsRef.current.map((m) =>
      m.id === target.id ? { ...m, hinted: true } : m
    );
    activeMeteorsRef.current = updated;
    setActiveMeteors(updated);

    setFeedbackPill({ front: target.card.front, back: target.card.back, kind: 'hint' });
    speakText(target.answerText);
    focusInputIfDesktop();
  }, [
    focusInputIfDesktop,
    gameOver,
    lockedOrLowestMeteor,
    paused,
    showRoundSummary,
    speakText,
    study.isComplete,
  ]);

  const handleListenLowest = useCallback(() => {
    if (paused || gameOver || showRoundSummary || study.isComplete) return;
    const target = lockedOrLowestMeteor();
    if (target) speakText(target.promptText);
  }, [gameOver, lockedOrLowestMeteor, paused, showRoundSummary, speakText, study.isComplete]);

  const handleTogglePause = useCallback(() => setPaused((p) => !p), []);
  const handleResume = useCallback(() => {
    setPaused(false);
    focusInputIfDesktop();
  }, [focusInputIfDesktop]);
  const handleReplay = useCallback(() => initWave(roundCards, true, true), [initWave, roundCards]);
  const handleGameOverReplay = useCallback(
    () => initWave(roundCards, false, true),
    [initWave, roundCards]
  );
  const handleToggleDirection = useCallback(
    () => setDirection((d) => (d === 'back_to_front' ? 'front_to_back' : 'back_to_front')),
    []
  );
  const handleSpeakAndFocus = useCallback(
    (text: string) => {
      speakText(text);
      focusInputIfDesktop();
    },
    [focusInputIfDesktop, speakText]
  );
  const handleLockMeteor = useCallback(
    (meteorId: string) => {
      updateLockedTargetId(meteorId);
      window.setTimeout(focusInput, 0);
    },
    [focusInput, updateLockedTargetId]
  );

  // Keyboard: Ctrl+Space hint, Space resumes, any typing goes to the hidden answer field
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Leave other text fields (e.g. the guide chat) alone.
      const target = event.target instanceof Element ? event.target : null;
      if (target !== inputRef.current && isTextEntryElement(target)) return;

      if (event.ctrlKey && event.code === 'Space') {
        ctrlSoloRef.current = false;
        event.preventDefault();
        handleHint();
      } else if (paused && !gameOver && !event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        handleResume();
      } else if (
        !paused &&
        !gameOver &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        document.activeElement !== inputRef.current &&
        (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Enter')
      ) {
        const activeTag = document.activeElement?.tagName;
        const isInteractiveFocused = activeTag === 'BUTTON' || activeTag === 'A';
        if (isInteractiveFocused && (event.key === 'Enter' || event.code === 'Space')) {
          return;
        }
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameOver, handleHint, handleResume, paused]);

  useEffect(() => {
    return () => {
      if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current);
      if (shakeTimerRef.current !== null) window.clearTimeout(shakeTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Fuzzy matching is not free; only re-run it when the text or the meteors change.
  const primedMeteor = useMemo(
    () => (input.trim() ? findMatchingMeteor(activeMeteors, input, elapsedMsRef.current) : null),
    [activeMeteors, input]
  );

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

  if (showRoundSummary) {
    return (
      <RoundSummary
        roundIndex={lastRoundStats.roundIndex}
        correctCount={lastRoundStats.correctCount}
        total={lastRoundStats.total}
        mode="GRAVITY"
        onNextRound={() => setShowRoundSummary(false)}
      />
    );
  }

  if (study.isComplete) {
    return (
      <SessionComplete
        mode="GRAVITY"
        correctCount={study.correctCount}
        total={study.cards.length}
        setId={setId}
      />
    );
  }

  const totalInRound = Math.max(1, roundCards.length);
  const completedInRound = Math.max(
    0,
    Math.min(totalInRound, totalInRound - spawnQueueRef.current.length - activeMeteors.length)
  );
  const progressPercent = Math.round((completedInRound / totalInRound) * 100);

  // The meteor the ship aims at: the one the text answers, else the locked one, else the lowest
  const activeTargetMeteor =
    primedMeteor ??
    activeMeteors.find((m) => m.id === lockedTargetId) ??
    closestToImpact(activeMeteors, elapsedMs) ??
    null;

  const shipXPercent = activeTargetMeteor ? shipXPercentFor(activeTargetMeteor.xPercent) : 50;
  const aimAngleDeg = activeTargetMeteor
    ? Math.max(
        -28,
        Math.min(
          28,
          Math.atan2(
            activeTargetMeteor.xPercent - shipXPercent,
            GRAVITY_SHIP_Y_PERCENT -
              laserTargetYPercent(getMeteorProgress(activeTargetMeteor, elapsedMs))
          ) *
            (180 / Math.PI)
        )
      )
    : 0;

  return (
    <div className="gravity-fx mx-auto max-w-5xl px-1 py-1">
      <StudyOfflineSyncStatus />

      {/* Tapping anywhere in the arena focuses the hidden answer field */}
      <div
        ref={setArenaEl}
        onPointerDown={(event) => {
          if (paused || gameOver) return;
          const targetEl = event.target as HTMLElement | null;
          if (targetEl?.closest('button, a')) return;
          window.setTimeout(focusInput, 0);
        }}
        className={cn(
          'relative flex h-[calc(100dvh-5.5rem)] max-h-[840px] w-full cursor-text select-none flex-col overflow-hidden rounded-2xl border border-sky-400/30 bg-[#030614] text-white shadow-[0_24px_80px_rgba(2,8,35,0.9)]',
          impactFlash && 'ring-4 ring-rose-500/90'
        )}
        style={arenaHeight ? { height: arenaHeight } : undefined}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={(event) => {
            isComposingRef.current = false;
            handleInputChange(event.currentTarget.value);
          }}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Control') {
              if (!event.repeat) {
                ctrlSoloRef.current = true;
              }
            } else if (event.ctrlKey) {
              ctrlSoloRef.current = false;
            }
            if (event.key === 'Enter' && (!isComposingRef.current || primedMeteor !== null)) {
              isComposingRef.current = false;
              event.preventDefault();
              handleFireSubmit();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setInput('');
              prevInputRef.current = '';
            }
          }}
          onKeyUp={(event) => {
            if (event.key === 'Control' && ctrlSoloRef.current) {
              ctrlSoloRef.current = false;
              handleListenLowest();
            }
          }}
          placeholder={t('studyUi.gravityInputPlaceholder')}
          aria-label={t('studyUi.gravityInputPlaceholder')}
          disabled={paused || gameOver}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="sr-only"
        />

        <GravityHud
          setId={setId}
          lives={lives}
          score={score}
          combo={combo}
          speedMultiplier={speedMultiplier}
          paused={paused}
          onSelectSpeed={handleSelectSpeed}
          onTogglePause={handleTogglePause}
          onReplay={handleReplay}
        />

        <div className="relative z-30 h-1.5 w-full bg-slate-950/90">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-lime-400 to-cyan-400 shadow-[0_0_14px_rgba(74,222,128,0.9)] transition-all duration-300"
            style={{ width: `${Math.max(4, progressPercent)}%` }}
          />
        </div>

        <div
          className="relative flex-1 overflow-hidden bg-[#040818] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/gravity/space-bg.webp')" }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#030616]/55 via-transparent to-[#020512]/70"
          />
          <GravityStarfield />

          {impactFlash && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-rose-600/45 via-rose-500/20 to-transparent"
            />
          )}

          <GravityLasers shots={laserShots} />
          <GravitySpaceship
            skin={shipSkin}
            xPercent={shipXPercent}
            aimAngleDeg={aimAngleDeg}
            shotSeq={shipShotSeq}
          />

          <div className="relative z-10 h-full w-full">
            {activeMeteors.map((meteor) => {
              const isTarget = meteor.id === activeTargetMeteor?.id;
              return (
                <GravityMeteorView
                  key={meteor.id}
                  meteor={meteor}
                  progress={getMeteorProgress(meteor, elapsedMs)}
                  isTarget={isTarget}
                  input={isTarget ? input : ''}
                  isPrimed={primedMeteor?.id === meteor.id}
                  hitSeq={meteorHits[meteor.id] ?? 0}
                  shake={inputShake && isTarget}
                  onLock={handleLockMeteor}
                  onSpeak={handleSpeakAndFocus}
                />
              );
            })}
            <GravityPoppedEffects effects={poppedEffects} />
          </div>

          <GravityControls
            feedbackPill={feedbackPill}
            hintDisabled={activeMeteors.length === 0 || paused || gameOver}
            direction={direction}
            showTypeButton={isTouch && !inputFocused && !paused && !gameOver}
            onHint={handleHint}
            onToggleDirection={handleToggleDirection}
            onSpeak={handleSpeakAndFocus}
            onFocusInput={focusInput}
          />

          {paused && !gameOver && <GravityPausedOverlay onResume={handleResume} />}

          {gameOver && (
            <GravityGameOverOverlay
              setId={setId}
              score={score}
              maxCombo={maxCombo}
              destroyedCount={destroyedCount}
              onReplay={handleGameOverReplay}
            />
          )}
        </div>
      </div>
    </div>
  );
}
