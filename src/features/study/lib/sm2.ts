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

const advanceInterval = (repetitions: number, interval: number, easeFactor: number): number => {
  if (repetitions === 0) {
    return 1;
  }
  if (repetitions === 1) {
    return 6;
  }
  return Math.max(1, Math.round(interval * easeFactor));
};

export function calculateSm2(state: Sm2State, grade: Sm2Grade, now = new Date()): Sm2Result {
  let { repetitions, easeFactor, interval } = state;

  if (grade === 0) {
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(EASE_FACTOR_MIN, easeFactor - 0.2);
  } else if (grade === 1) {
    easeFactor = Math.max(EASE_FACTOR_MIN, easeFactor - 0.15);
    interval = Math.max(1, Math.ceil(interval * 1.2));
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
