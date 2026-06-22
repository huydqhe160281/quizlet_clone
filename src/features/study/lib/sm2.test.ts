import { describe, expect, it } from 'vitest';
import { calculateSm2, EASE_FACTOR_MIN } from '@/features/study/lib/sm2';

const base = { repetitions: 0, easeFactor: 2.5, interval: 0 };

describe('SM-2 algorithm', () => {
  it('test_sm2_first_review_good: first GOOD review schedules tomorrow', () => {
    const result = calculateSm2(base, 2, new Date('2026-06-17T00:00:00.000Z'));
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBe(2.5);
    expect(result.nextDueDate.toISOString()).toBe('2026-06-18T00:00:00.000Z');
  });

  it('test_sm2_second_review_good: second GOOD review uses 6-day interval', () => {
    const result = calculateSm2(
      { repetitions: 1, easeFactor: 2.5, interval: 1 },
      2,
      new Date('2026-06-17T00:00:00.000Z')
    );
    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(6);
    expect(result.easeFactor).toBe(2.5);
  });

  it('test_sm2_failed_again: AGAIN resets repetitions and lowers ease', () => {
    const result = calculateSm2({ repetitions: 5, easeFactor: 2.5, interval: 30 }, 0);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBe(2.3);
  });

  it('test_sm2_easy_boost: EASY increases ease factor', () => {
    const result = calculateSm2(base, 3);
    expect(result.easeFactor).toBe(2.6);
  });

  it('test_sm2_hard_grade: HARD keeps repetitions and soft-boosts interval', () => {
    const result = calculateSm2({ repetitions: 2, easeFactor: 2.5, interval: 6 }, 1);
    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(8);
    expect(result.easeFactor).toBe(2.35);
  });

  it('test_sm2_ease_floor: ease factor never drops below 1.3', () => {
    const result = calculateSm2({ repetitions: 2, easeFactor: 1.35, interval: 6 }, 1);
    expect(result.easeFactor).toBe(EASE_FACTOR_MIN);
  });
});
