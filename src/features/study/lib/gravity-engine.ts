import { answerKey, fuzzyMatch } from '@/lib/utils/fuzzy';
import { parseEmbeddedMcq } from '@/features/study/lib/mcq-parser';
import type { StudyCard } from '@/features/study/store';

export const GRAVITY_MAX_LIVES = 5;
export const GRAVITY_MAX_CONCURRENT_METEORS = 2;
export const GRAVITY_LANES = [22, 50, 78] as const;
export const GRAVITY_BASE_FALL_DURATION_MS = 14000;
export const GRAVITY_MIN_FALL_DURATION_MS = 6500;
export const GRAVITY_SPAWN_INTERVAL_MS = 4200;
export const GRAVITY_SPEED_MULTIPLIERS = [1, 1.25, 1.5, 1.75, 2] as const;

export type GravitySpeedMultiplier = (typeof GRAVITY_SPEED_MULTIPLIERS)[number];
export type GravityDirection = 'back_to_front' | 'front_to_back';

export type GravityMeteor = {
  id: string;
  card: StudyCard;
  promptText: string;
  answerText: string;
  /** Additional accepted answers (e.g. option text for embedded MCQ cards). */
  altAnswers: string[];
  laneIndex: number;
  xPercent: number;
  spawnedAtMs: number;
  durationMs: number;
  /** Unscaled 1x fall duration so repeated mid-wave speed changes never accumulate rounding drift. */
  baseDurationMs: number;
  hinted: boolean;
};

export type GravityPoppedEffect = {
  id: string;
  text: string;
  xPercent: number;
  yPercent: number;
  points: number;
  createdAtMs: number;
  kind: 'hit' | 'impact';
};

/** Vertical travel of a meteor inside the play field, in percent of its height. */
const METEOR_TOP_START_PERCENT = 2;
const METEOR_TRAVEL_PERCENT = 63;
/** Where laser beams leave the ship's nose, in percent of the field height. */
export const GRAVITY_SHIP_Y_PERCENT = 81;

export function meteorTopPercent(progress: number): number {
  return METEOR_TOP_START_PERCENT + progress * METEOR_TRAVEL_PERCENT;
}

/** Where a laser hits a meteor (its rock, a little below the card's top edge). */
export function laserTargetYPercent(progress: number): number {
  return meteorTopPercent(progress) + 4;
}

/** The ship follows its target part-way so it stays near the centre of the field. */
export function shipXPercentFor(targetXPercent: number): number {
  return 50 + (targetXPercent - 50) * 0.45;
}

export type GravityFeedbackPill = {
  front: string;
  back: string;
  kind: 'hit' | 'miss' | 'hint';
};

export const normalizeGravityText = answerKey;

function answerCandidates(meteor: GravityMeteor): string[] {
  return [meteor.answerText, ...meteor.altAnswers].filter(Boolean);
}

/**
 * Whether typed text answers `candidate`. An exact (case/whitespace-insensitive) answer
 * always counts; a typo counts only when the input is about as long as the answer.
 * Jaro-Winkler rewards shared prefixes, so without that check an unfinished answer
 * ("học sinh" for "học sinh viên") or a sibling term ("word two" for "word three") passes.
 */
export function isGravityAnswerMatch(input: string, candidate: string): boolean {
  const typed = normalizeGravityText(input);
  const expected = normalizeGravityText(candidate);
  if (!typed || !expected) return false;
  if (typed === expected) return true;
  if (expected.startsWith(typed)) return false;
  const typedLength = Array.from(typed).length;
  const expectedLength = Array.from(expected).length;
  const lengthSlack = Math.max(1, Math.floor(expectedLength * 0.15));
  if (Math.abs(typedLength - expectedLength) > lengthSlack) return false;
  return fuzzyMatch(typed, expected);
}

/** Base letters only, so Telex/VNI typing ("nha" before the tone key) still reads as a prefix. */
function baseLetters(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function isTypedPrefixOf(typed: string, candidate: string): boolean {
  const expected = normalizeGravityText(candidate);
  return expected.startsWith(typed) || baseLetters(expected).startsWith(baseLetters(typed));
}

export type GravityTypedAnalysis = {
  status: 'idle' | 'matching' | 'primed' | 'typo';
  matchedSlice: string;
  typoSlice: string;
  remainingCount: number;
};

/**
 * Live feedback for the text typed at a meteor: still on track (`matching`), ready to
 * fire (`primed`, the same rule Enter uses), or off track (`typo`, split at the longest
 * prefix that still fits an answer).
 */
export function analyzeTypedAnswer(rawInput: string, meteor: GravityMeteor): GravityTypedAnalysis {
  const typed = rawInput.trim().replace(/\s+/g, ' ');
  const candidates = answerCandidates(meteor);
  if (!typed) {
    return {
      status: 'idle',
      matchedSlice: '',
      typoSlice: '',
      remainingCount: meteor.answerText.trim().length,
    };
  }

  if (candidates.some((candidate) => isGravityAnswerMatch(typed, candidate))) {
    return { status: 'primed', matchedSlice: typed, typoSlice: '', remainingCount: 0 };
  }

  const normalized = normalizeGravityText(typed);
  const prefixCandidate = candidates.find((candidate) => isTypedPrefixOf(normalized, candidate));
  if (prefixCandidate) {
    return {
      status: 'matching',
      matchedSlice: typed,
      typoSlice: '',
      remainingCount: Math.max(0, normalizeGravityText(prefixCandidate).length - typed.length),
    };
  }

  let matchedLength = 0;
  let targetLength = meteor.answerText.trim().length;
  for (let length = typed.length - 1; length >= 1; length -= 1) {
    const slice = normalizeGravityText(typed.slice(0, length));
    const candidate = candidates.find((c) => isTypedPrefixOf(slice, c));
    if (candidate) {
      matchedLength = length;
      targetLength = normalizeGravityText(candidate).length;
      break;
    }
  }

  return {
    status: 'typo',
    matchedSlice: typed.slice(0, matchedLength),
    typoSlice: typed.slice(matchedLength),
    remainingCount: Math.max(0, targetLength - typed.length),
  };
}

export function resolveCardPromptAndAnswer(
  card: StudyCard,
  direction: GravityDirection
): {
  promptText: string;
  answerText: string;
  altAnswers: string[];
} {
  const mcq = parseEmbeddedMcq(card.front, card.back);
  if (mcq) {
    const correctOpt = mcq.options.find((o) => o.key === mcq.correctKey);
    return {
      promptText: card.front.trim(),
      answerText: mcq.correctKey,
      altAnswers: correctOpt ? [correctOpt.text, correctOpt.label] : [],
    };
  }

  if (direction === 'back_to_front') {
    return {
      promptText: card.back.trim(),
      answerText: card.front.trim(),
      altAnswers: [],
    };
  }

  return {
    promptText: card.front.trim(),
    answerText: card.back.trim(),
    altAnswers: [],
  };
}

export function computeFallDurationMs(
  combo: number,
  roundIndex: number,
  speedMultiplier: number = 1
): number {
  const safeMultiplier = Math.max(1, speedMultiplier);
  const speedReduction = combo * 280 + roundIndex * 450;
  const baseDuration = Math.max(
    GRAVITY_MIN_FALL_DURATION_MS,
    GRAVITY_BASE_FALL_DURATION_MS - speedReduction
  );
  return Math.round(baseDuration / safeMultiplier);
}

export function getMeteorProgress(meteor: GravityMeteor, elapsedMs: number): number {
  if (meteor.durationMs <= 0) return 1;
  return Math.min(1, Math.max(0, (elapsedMs - meteor.spawnedAtMs) / meteor.durationMs));
}

/**
 * Picks a free lane as far as possible from the meteors already falling, so their
 * cards don't overlap on narrow (phone) screens. Ties are broken by `seed`.
 */
export function pickNextLaneIndex(activeMeteors: GravityMeteor[], seed = 0): number {
  const usedLanes = activeMeteors.map((m) => m.laneIndex);
  const lanes = GRAVITY_LANES.map((_, index) => index);
  const free = lanes.filter((lane) => !usedLanes.includes(lane));
  if (usedLanes.length === 0 || free.length === 0) {
    return lanes[Math.abs(seed) % lanes.length] ?? 0;
  }
  const distance = (lane: number) => Math.min(...usedLanes.map((used) => Math.abs(lane - used)));
  const best = Math.max(...free.map(distance));
  const farthest = free.filter((lane) => distance(lane) === best);
  return farthest[Math.abs(seed) % farthest.length] ?? 0;
}

export function calculateMeteorScore(
  meteor: GravityMeteor,
  elapsedMs: number,
  nextCombo: number,
  speedMultiplier: number = 1
): number {
  const safeMultiplier = Math.max(1, speedMultiplier);
  if (meteor.hinted) {
    return Math.round(5 * safeMultiplier);
  }
  const progress = getMeteorProgress(meteor, elapsedMs);
  const speedBonus = Math.round((1 - progress) * 6);
  const comboMultiplier = Math.min(3, 1 + Math.floor((nextCombo - 1) / 3) * 0.25);
  const baseScore = Math.max(10, Math.round((10 + speedBonus) * comboMultiplier));
  return Math.round(baseScore * safeMultiplier);
}

/**
 * The meteor an answer is aimed at. An exact answer wins over a typo-tolerant one, so
 * typing one card's answer never blasts a lower meteor with a similar answer; within
 * each pass the meteor closest to impact goes first.
 */
export function findMatchingMeteor(
  activeMeteors: GravityMeteor[],
  rawInput: string,
  elapsedMs: number
): GravityMeteor | null {
  const typed = normalizeGravityText(rawInput);
  if (!typed) return null;

  const sorted = [...activeMeteors].sort(
    (a, b) => getMeteorProgress(b, elapsedMs) - getMeteorProgress(a, elapsedMs)
  );
  const exact = sorted.find((meteor) =>
    answerCandidates(meteor).some((candidate) => normalizeGravityText(candidate) === typed)
  );
  if (exact) return exact;

  return (
    sorted.find((meteor) =>
      answerCandidates(meteor).some((candidate) => isGravityAnswerMatch(rawInput, candidate))
    ) ?? null
  );
}

export function buildHintText(answerText: string): string {
  const trimmed = answerText.trim();
  if (trimmed.length <= 2) {
    return trimmed;
  }
  const revealCount = Math.max(1, Math.ceil(trimmed.length * 0.4));
  const revealed = trimmed.slice(0, revealCount);
  const masked = Array.from(trimmed.slice(revealCount))
    .map((ch) => (ch === ' ' ? ' ' : '•'))
    .join('');
  return `${revealed}${masked}`;
}
