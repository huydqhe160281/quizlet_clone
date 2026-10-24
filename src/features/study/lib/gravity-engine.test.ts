import { describe, expect, it } from 'vitest';
import type { StudyCard } from '@/features/study/store';
import {
  analyzeTypedAnswer,
  buildHintText,
  calculateMeteorScore,
  computeFallDurationMs,
  findMatchingMeteor,
  getMeteorProgress,
  GRAVITY_BASE_FALL_DURATION_MS,
  GRAVITY_MIN_FALL_DURATION_MS,
  isGravityAnswerMatch,
  normalizeGravityText,
  pickNextLaneIndex,
  resolveCardPromptAndAnswer,
  type GravityMeteor,
} from './gravity-engine';

function makeCard(overrides: Partial<StudyCard> = {}): StudyCard {
  return {
    sessionCardId: overrides.sessionCardId ?? 'sc-1',
    cardId: overrides.cardId ?? 'c-1',
    front: overrides.front ?? '姓',
    back: overrides.back ?? 'họ',
    example: overrides.example ?? null,
    imageUrl: overrides.imageUrl ?? null,
  };
}

function makeMeteor(overrides: Partial<GravityMeteor> = {}): GravityMeteor {
  const card = overrides.card ?? makeCard();
  return {
    id: overrides.id ?? 'meteor-1',
    card,
    promptText: overrides.promptText ?? card.back,
    answerText: overrides.answerText ?? card.front,
    altAnswers: overrides.altAnswers ?? [],
    laneIndex: overrides.laneIndex ?? 0,
    xPercent: overrides.xPercent ?? 26,
    spawnedAtMs: overrides.spawnedAtMs ?? 0,
    durationMs: overrides.durationMs ?? 10000,
    baseDurationMs: overrides.baseDurationMs ?? overrides.durationMs ?? 10000,
    hinted: overrides.hinted ?? false,
  };
}

describe('gravity-engine', () => {
  describe('normalizeGravityText', () => {
    it('trims, lowercases, and collapses internal whitespace', () => {
      expect(normalizeGravityText('   Xin   Chào   ')).toBe('xin chào');
      expect(normalizeGravityText('')).toBe('');
    });
  });

  describe('resolveCardPromptAndAnswer', () => {
    it('resolves prompt=back and answer=front for back_to_front', () => {
      const card = makeCard({ front: ' 姓 ', back: ' họ ' });
      expect(resolveCardPromptAndAnswer(card, 'back_to_front')).toEqual({
        promptText: 'họ',
        answerText: '姓',
        altAnswers: [],
      });
    });

    it('resolves prompt=front and answer=back for front_to_back', () => {
      const card = makeCard({ front: ' 姓 ', back: ' họ ' });
      expect(resolveCardPromptAndAnswer(card, 'front_to_back')).toEqual({
        promptText: '姓',
        answerText: 'họ',
        altAnswers: [],
      });
    });

    it('resolves embedded MCQ cards with option key and altAnswers', () => {
      const card = makeCard({
        front: 'What is 1 + 1?\na. One\nb. Two\nc. Three',
        back: 'b',
      });
      expect(resolveCardPromptAndAnswer(card, 'back_to_front')).toEqual({
        promptText: 'What is 1 + 1?\na. One\nb. Two\nc. Three',
        answerText: 'b',
        altAnswers: ['Two', 'b. Two'],
      });
    });
  });

  describe('computeFallDurationMs', () => {
    it('starts at base duration when combo and roundIndex are 0', () => {
      expect(computeFallDurationMs(0, 0)).toBe(GRAVITY_BASE_FALL_DURATION_MS);
    });

    it('scales faster with higher combo and roundIndex', () => {
      const d1 = computeFallDurationMs(3, 0);
      const d2 = computeFallDurationMs(3, 2);
      expect(d1).toBeLessThan(GRAVITY_BASE_FALL_DURATION_MS);
      expect(d2).toBeLessThan(d1);
    });

    it('clamps at GRAVITY_MIN_FALL_DURATION_MS', () => {
      expect(computeFallDurationMs(50, 20)).toBe(GRAVITY_MIN_FALL_DURATION_MS);
    });

    it('divides fall duration proportionally by speedMultiplier (1.25, 1.5, 1.75, 2)', () => {
      const base = computeFallDurationMs(0, 0, 1);
      expect(computeFallDurationMs(0, 0, 1.25)).toBe(Math.round(base / 1.25));
      expect(computeFallDurationMs(0, 0, 1.5)).toBe(Math.round(base / 1.5));
      expect(computeFallDurationMs(0, 0, 1.75)).toBe(Math.round(base / 1.75));
      expect(computeFallDurationMs(0, 0, 2)).toBe(Math.round(base / 2));
    });
  });

  describe('getMeteorProgress', () => {
    it('clamps progress between 0 and 1', () => {
      const meteor = makeMeteor({ spawnedAtMs: 1000, durationMs: 4000 });
      expect(getMeteorProgress(meteor, 500)).toBe(0);
      expect(getMeteorProgress(meteor, 3000)).toBe(0.5);
      expect(getMeteorProgress(meteor, 9000)).toBe(1);
    });

    it('returns 1 when durationMs <= 0', () => {
      const meteor = makeMeteor({ durationMs: 0 });
      expect(getMeteorProgress(meteor, 0)).toBe(1);
    });
  });

  describe('pickNextLaneIndex', () => {
    it('chooses an unoccupied lane first', () => {
      const m0 = makeMeteor({ laneIndex: 0 });
      const m1 = makeMeteor({ laneIndex: 1 });
      expect(pickNextLaneIndex([m0, m1], 5)).toBe(2);
    });

    it('falls back to any lane when all lanes are occupied', () => {
      const meteors = [
        makeMeteor({ laneIndex: 0 }),
        makeMeteor({ laneIndex: 1 }),
        makeMeteor({ laneIndex: 2 }),
      ];
      const lane = pickNextLaneIndex(meteors, 4);
      expect([0, 1, 2]).toContain(lane);
    });

    it('keeps a second meteor in the lane farthest from the first so cards do not overlap', () => {
      expect(pickNextLaneIndex([makeMeteor({ laneIndex: 0 })], 0)).toBe(2);
      expect(pickNextLaneIndex([makeMeteor({ laneIndex: 0 })], 7)).toBe(2);
      expect(pickNextLaneIndex([makeMeteor({ laneIndex: 2 })], 3)).toBe(0);
    });
  });

  describe('calculateMeteorScore', () => {
    it('caps score at 5 when meteor was hinted', () => {
      const meteor = makeMeteor({ hinted: true, spawnedAtMs: 0, durationMs: 10000 });
      expect(calculateMeteorScore(meteor, 1000, 10)).toBe(5);
    });

    it('awards base score + speed bonus and scales with combo multiplier', () => {
      const meteor = makeMeteor({ hinted: false, spawnedAtMs: 0, durationMs: 10000 });
      const earlyScoreCombo1 = calculateMeteorScore(meteor, 0, 1); // progress 0 -> speedBonus 6 -> 16 * 1 = 16
      const lateScoreCombo1 = calculateMeteorScore(meteor, 9500, 1); // progress 0.95 -> speedBonus 0 -> 10 * 1 = 10
      const earlyScoreCombo7 = calculateMeteorScore(meteor, 0, 7); // multiplier 1.5 -> 16 * 1.5 = 24

      expect(earlyScoreCombo1).toBe(16);
      expect(lateScoreCombo1).toBe(10);
      expect(earlyScoreCombo7).toBe(24);
    });

    it('scales earned points proportionally with speedMultiplier (1.25, 1.5, 1.75, 2)', () => {
      const meteor = makeMeteor({ hinted: false, spawnedAtMs: 0, durationMs: 10000 });
      expect(calculateMeteorScore(meteor, 0, 1, 1)).toBe(16);
      expect(calculateMeteorScore(meteor, 0, 1, 1.25)).toBe(Math.round(16 * 1.25));
      expect(calculateMeteorScore(meteor, 0, 1, 1.5)).toBe(Math.round(16 * 1.5));
      expect(calculateMeteorScore(meteor, 0, 1, 1.75)).toBe(Math.round(16 * 1.75));
      expect(calculateMeteorScore(meteor, 0, 1, 2)).toBe(Math.round(16 * 2));
    });
  });

  describe('findMatchingMeteor', () => {
    it('matches exact normalized answer and prioritizes meteor closest to impact', () => {
      const mHigher = makeMeteor({
        id: 'm-high',
        answerText: 'xin chào',
        spawnedAtMs: 5000,
        durationMs: 10000,
      });
      const mLower = makeMeteor({
        id: 'm-low',
        answerText: 'xin chào',
        spawnedAtMs: 1000,
        durationMs: 10000,
      });

      const matched = findMatchingMeteor([mHigher, mLower], '  XIN CHÀO ', 7000);
      expect(matched?.id).toBe('m-low');
    });

    it('prefers an exact answer on a higher meteor over a similar answer on a lower one', () => {
      const lowerSibling = makeMeteor({
        id: 'm-three',
        answerText: 'word three',
        spawnedAtMs: 0,
      });
      const exactTarget = makeMeteor({ id: 'm-two', answerText: 'word two', spawnedAtMs: 5000 });

      expect(findMatchingMeteor([lowerSibling, exactTarget], 'word two', 6000)?.id).toBe('m-two');
      expect(findMatchingMeteor([lowerSibling], 'word two', 6000)).toBeNull();
    });

    it('matches slight typos via fuzzyMatch', () => {
      const m1 = makeMeteor({ id: 'm-fuzzy', answerText: 'international' });
      expect(findMatchingMeteor([m1], 'internationl', 1000)?.id).toBe('m-fuzzy');
    });
  });

  describe('isGravityAnswerMatch', () => {
    it('accepts exact answers regardless of case and spacing', () => {
      expect(isGravityAnswerMatch('  Xin   CHÀO ', 'xin chào')).toBe(true);
    });

    it('rejects an unfinished answer even when it scores high on Jaro-Winkler', () => {
      expect(isGravityAnswerMatch('học sinh', 'học sinh viên')).toBe(false);
      expect(isGravityAnswerMatch('ab', 'abc')).toBe(false);
      expect(isGravityAnswerMatch('internatio', 'international')).toBe(false);
    });

    it('rejects a sibling term of a different length', () => {
      expect(isGravityAnswerMatch('word two', 'word three')).toBe(false);
    });

    it('still forgives a one-letter typo of the full answer', () => {
      expect(isGravityAnswerMatch('internationl', 'international')).toBe(true);
      expect(isGravityAnswerMatch('internatoinal', 'international')).toBe(true);
    });

    it('treats different diacritics as a different word', () => {
      expect(isGravityAnswerMatch('ma', 'mà')).toBe(false);
    });
  });

  describe('analyzeTypedAnswer', () => {
    const meteor = makeMeteor({ answerText: 'nhà cửa' });

    it('is idle before typing', () => {
      expect(analyzeTypedAnswer('  ', meteor)).toMatchObject({ status: 'idle', remainingCount: 7 });
    });

    it('is matching on a prefix, including Telex input before the tone key', () => {
      expect(analyzeTypedAnswer('nhà', meteor)).toMatchObject({
        status: 'matching',
        remainingCount: 4,
      });
      expect(analyzeTypedAnswer('nha c', meteor).status).toBe('matching');
    });

    it('is primed only once the whole answer is typed', () => {
      expect(analyzeTypedAnswer('nhà cử', meteor).status).toBe('matching');
      expect(analyzeTypedAnswer('nhà cửa', meteor).status).toBe('primed');
    });

    it('splits a typo at the longest prefix that still fits', () => {
      expect(analyzeTypedAnswer('nhx', meteor)).toMatchObject({
        status: 'typo',
        matchedSlice: 'nh',
        typoSlice: 'x',
      });
    });
  });

  describe('buildHintText', () => {
    it('returns full trimmed text for short strings <= 2 characters', () => {
      expect(buildHintText('姓')).toBe('姓');
      expect(buildHintText('họ')).toBe('họ');
    });

    it('masks remaining characters with bullets while preserving spaces for longer strings', () => {
      // 'xin chào' length 8 -> ceil(8 * 0.4) = 4 revealed ('xin '), 'chào' -> '••••'
      expect(buildHintText('xin chào')).toBe('xin ••••');
    });
  });
});
