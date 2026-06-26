import { describe, expect, it, vi, beforeEach } from 'vitest';

const findManyMock = vi.fn();

vi.mock('@/server/db', () => ({
  prisma: {
    cardProgress: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
    flashcard: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { getDueCards } from '@/server/services/study/study.service';

describe('study spaced repetition queries', () => {
  beforeEach(() => {
    findManyMock.mockReset();
    findManyMock
      .mockResolvedValueOnce([
        {
          cardId: 'card-1',
          dueDate: new Date('2026-06-17T00:00:00.000Z'),
          easeFactor: 2.5,
          interval: 1,
          repetitions: 1,
          card: {
            front: 'hello',
            back: 'xin chào',
            setId: 'set-1',
            set: { title: 'Vocab' },
          },
        },
      ])
      .mockResolvedValueOnce([{ cardId: 'card-1' }]);
  });

  it('test_due_cards_query: returns due progress cards ordered by due date', async () => {
    const result = await getDueCards('user-a');
    expect(result.count).toBe(1);
    expect(result.data[0]?.cardId).toBe('card-1');
  });
});
