import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  flashcardSet: {
    findUnique: vi.fn(),
  },
  studySession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  sessionCard: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({
  prisma: prismaMock,
}));

import {
  completeSession,
  createSession,
  getSessionCards,
  recordSessionAnswer,
} from '@/server/services/study.service';

describe('study.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_study_session_created: creates session with session cards', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [
        { id: 'card-1', sortOrder: 0 },
        { id: 'card-2', sortOrder: 1 },
      ],
    });

    prismaMock.studySession.create.mockResolvedValue({
      id: 'session-1',
      totalCards: 2,
      mode: 'FLASHCARD',
    });

    const session = await createSession('user-a', 'set-1', 'FLASHCARD');

    expect(session.totalCards).toBe(2);
    expect(prismaMock.studySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-a',
          setId: 'set-1',
          mode: 'FLASHCARD',
          totalCards: 2,
        }),
      })
    );
  });

  it('test_study_session_completed: stores score from correct count', async () => {
    prismaMock.studySession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-a',
      totalCards: 4,
    });

    prismaMock.studySession.update.mockResolvedValue({
      id: 'session-1',
      correctCount: 3,
      score: 0.75,
      completedAt: new Date(),
    });

    const session = await completeSession('session-1', 'user-a', 3);

    expect(session.score).toBe(0.75);
    expect(prismaMock.studySession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          correctCount: 3,
          score: 0.75,
        }),
      })
    );
  });

  it('test_create_session_with_settings: creates session with settings persisted', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [
        { id: 'card-1', sortOrder: 0 },
        { id: 'card-2', sortOrder: 1 },
      ],
    });

    prismaMock.studySession.create.mockResolvedValue({
      id: 'session-1',
      totalCards: 2,
      mode: 'LEARN',
      settings: {
        randomize: false,
        cardsPerRound: 10,
        requeueWrong: true,
      },
    });

    const settings = {
      randomize: false,
      cardsPerRound: 10,
      requeueWrong: true,
    };

    const session = await createSession('user-a', 'set-1', 'LEARN', settings);

    expect(prismaMock.studySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-a',
          setId: 'set-1',
          mode: 'LEARN',
          totalCards: 2,
          settings,
        }),
      })
    );
  });

  it('test_create_session_empty_set: rejects set with no cards', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [],
    });

    await expect(createSession('user-a', 'set-1', 'FLASHCARD')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  });

  it('test_get_session_cards: returns cards for owned session', async () => {
    prismaMock.studySession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-a',
    });
    prismaMock.sessionCard.findMany.mockResolvedValue([{ id: 'sc-1', card: { front: 'a' } }]);

    const cards = await getSessionCards('session-1', 'user-a');
    expect(cards).toHaveLength(1);
  });

  it('test_record_session_answer: updates session card result', async () => {
    prismaMock.studySession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-a',
    });
    prismaMock.sessionCard.findFirst.mockResolvedValue({ id: 'sc-1' });
    prismaMock.sessionCard.update.mockResolvedValue({ id: 'sc-1', isCorrect: true });

    const result = await recordSessionAnswer('session-1', 'user-a', 'card-1', true);
    expect(result.isCorrect).toBe(true);
  });
});
