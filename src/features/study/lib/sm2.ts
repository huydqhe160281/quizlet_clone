export const EASE_FACTOR_MIN = 1.3;

export type Sm2Grade = 0 | 1 | 2 | 3;

export type Sm2State = {
  repetitions: number;
  easeFactor: number;
  interval: number;
};

export type Sm2Result = Sm2State & {
  nextDueDate: Date;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const HARD_INTERVAL_MULTIPLIER = 1.2;

const hardInterval = (interval: number): number =>
  Math.max(1, Math.ceil(interval * HARD_INTERVAL_MULTIPLIER));

const advanceInterval = (repetitions: number, interval: number, easeFactor: number): number => {
  const step =
    repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.max(1, Math.round(interval * easeFactor));
  // HARD grows the interval without advancing `repetitions`, so after a few HARDs the
  // fixed early steps (1 and 6 days) can be shorter than the current interval. A better
  // grade must never schedule the card sooner than HARD would have.
  return interval > 0 ? Math.max(step, hardInterval(interval)) : step;
};

export function calculateSm2(state: Sm2State, grade: Sm2Grade, now = new Date()): Sm2Result {
  let { repetitions, easeFactor, interval } = state;

  if (grade === 0) {
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(EASE_FACTOR_MIN, easeFactor - 0.2);
  } else if (grade === 1) {
    easeFactor = Math.max(EASE_FACTOR_MIN, easeFactor - 0.15);
    interval = hardInterval(interval);
  } else if (grade === 2) {
    interval = advanceInterval(repetitions, interval, easeFactor);
    repetitions += 1;
  } else {
    easeFactor += 0.1;
    interval = advanceInterval(repetitions, interval, easeFactor);
    repetitions += 1;
  }

  return {
    repetitions,
    easeFactor,
    interval,
    nextDueDate: addDays(now, interval),
  };
}

export function gradeToSm2(grade: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'): Sm2Grade {
  const map = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 } as const;
  return map[grade];
}

/**
 * Single rule for whether a review counts as correct (accuracy, totals, requeue).
 * HARD counts as not correct, matching the learning queue's "weak" definition.
 */
export function isCorrectGrade(grade: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'): boolean {
  return grade === 'GOOD' || grade === 'EASY';
}
