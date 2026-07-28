import { describe, expect, it } from 'vitest';
import { Grade } from '@prisma/client';
import { cardIdsWithLatestFail } from '@/server/services/learning/weak-latest';

describe('weak latest grade', () => {
  it('Scenario: Weak card included when not due — uses latest grade only', () => {
    // Oldest AGAIN then newest GOOD → not weak by latest rule
    const recovered = cardIdsWithLatestFail([
      { cardId: 'c1', grade: Grade.GOOD },
      { cardId: 'c1', grade: Grade.AGAIN },
    ]);
    expect(recovered.has('c1')).toBe(false);

    // Latest AGAIN → weak
    const stillWeak = cardIdsWithLatestFail([
      { cardId: 'c2', grade: Grade.AGAIN },
      { cardId: 'c2', grade: Grade.GOOD },
    ]);
    expect(stillWeak.has('c2')).toBe(true);
  });
});
