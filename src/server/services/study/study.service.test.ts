import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  flashcardSet: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
  studySession: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  sessionCard: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  processedMutation: {
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
  },
  cardProgress: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  reviewHistory: {
    create: vi.fn(),
  },
  flashcard: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({
  prisma: prismaMock,
}));

const { assertCanStartStudyMock } = vi.hoisted(() => ({
  assertCanStartStudyMock: vi.fn(),
}));
vi.mock('@/server/auth/email-verified', () => ({
  assertCanStartStudy: assertCanStartStudyMock,
}));

vi.mock('@/server/services/user/stats.service', () => ({
  getEffectiveStreak: vi.fn((currentStreak: number) => currentStreak),
  recordDailyStudyActivity: vi.fn().mockResolvedValue({
    stats: { currentStreak: 1, longestStreak: 1, lastStudiedDate: new Date() },
    changed: true,
  }),
  recordReviewStats: vi.fn(),
}));

import {
  completeSession,
  createSession,
  getOwnedSessionForStudy,
  getSessionCards,
  recordSessionAnswer,
  recordSessionAnswersBatch,
  settingsMatchStored,
} from '@/server/services/study/study.service';
import { recordDailyStudyActivity } from '@/server/services/user/stats.service';
import { STUDY_SESSION_SETTINGS_DEFAULTS } from '@/features/study/schemas/study.schema';

describe('study.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertCanStartStudyMock.mockResolvedValue(undefined);
    prismaMock.studySession.findFirst.mockResolvedValue(null);
    prismaMock.studySession.findMany.mockResolvedValue([]);
    prismaMock.processedMutation.findMany.mockResolvedValue([]);
    prismaMock.processedMutation.createMany.mockResolvedValue({ count: 0 });
    prismaMock.processedMutation.create.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prismaMock) => unknown)(prismaMock);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
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

    prismaMock.studySession.findFirst.mockResolvedValue(null);
    prismaMock.studySession.create.mockResolvedValue({
      id: 'session-1',
      totalCards: 2,
      mode: 'FLASHCARD',
    });

    const { session } = await createSession('user-a', 'set-1', 'FLASHCARD');

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

  it('resumes incomplete session with matching settings instead of creating', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [{ id: 'card-1', sortOrder: 0, type: null }],
    });

    const existing = {
      id: 'session-existing',
      totalCards: 1,
      mode: 'LEARN',
      settings: null,
      sessionCards: [{ cardId: 'card-1' }],
    };
    prismaMock.studySession.findMany.mockResolvedValue([existing]);

    const { session } = await createSession('user-a', 'set-1', 'LEARN');

    expect(session.id).toBe('session-existing');
    expect(prismaMock.studySession.create).not.toHaveBeenCalled();
  });

  it('lets an unverified account past the limit resume but not start a session', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [{ id: 'card-1', sortOrder: 0, type: null }],
    });
    assertCanStartStudyMock.mockRejectedValue(
      Object.assign(new Error('limit'), { code: 'STUDY_LIMIT_REACHED', status: 403 })
    );

    prismaMock.studySession.findMany.mockResolvedValue([
      { id: 'session-open', settings: null, sessionCards: [{ cardId: 'card-1' }] },
    ]);
    const { session } = await createSession('user-a', 'set-1', 'LEARN');
    expect(session.id).toBe('session-open');

    prismaMock.studySession.findMany.mockResolvedValue([]);
    await expect(createSession('user-a', 'set-1', 'LEARN')).rejects.toMatchObject({
      code: 'STUDY_LIMIT_REACHED',
    });
    expect(prismaMock.studySession.create).not.toHaveBeenCalled();
    expect(recordDailyStudyActivity).toHaveBeenCalledTimes(1);
  });

  it('creates a new session when settings differ from incomplete one', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [{ id: 'card-1', sortOrder: 0, type: null }],
    });

    prismaMock.studySession.findMany.mockResolvedValue([
      {
        id: 'session-old',
        settings: { randomize: false },
        sessionCards: [{ cardId: 'card-1' }],
      },
    ]);
    prismaMock.studySession.create.mockResolvedValue({
      id: 'session-new',
      totalCards: 1,
      mode: 'FLASHCARD',
    });

    const { session } = await createSession('user-a', 'set-1', 'FLASHCARD', {
      randomize: true,
      cardsPerRound: 10,
      requeueWrong: true,
      presentation: 'default',
      mcDirection: 'front_to_back',
    });

    expect(session.id).toBe('session-new');
    expect(prismaMock.studySession.create).toHaveBeenCalled();
  });

  it('resumes when stored JSONB settings come back with a different key order', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [{ id: 'card-1', sortOrder: 0, type: null }],
    });

    // Postgres JSONB orders keys by length, then bytes — not by insertion order.
    prismaMock.studySession.findMany.mockResolvedValue([
      {
        id: 'session-existing',
        totalCards: 1,
        mode: 'LEARN',
        settings: {
          randomize: false,
          mcDirection: 'front_to_back',
          presentation: 'multiple_choice',
          requeueWrong: true,
          cardsPerRound: 10,
        },
        sessionCards: [{ cardId: 'card-1' }],
      },
    ]);

    const { session } = await createSession('user-a', 'set-1', 'LEARN', {
      randomize: false,
      cardsPerRound: 10,
      requeueWrong: true,
      presentation: 'multiple_choice',
      mcDirection: 'front_to_back',
    });

    expect(session.id).toBe('session-existing');
    expect(prismaMock.studySession.create).not.toHaveBeenCalled();
  });

  it('settingsMatchStored never matches invalid stored settings', () => {
    expect(settingsMatchStored({ randomize: 'yes' }, undefined)).toBe(false);
    expect(settingsMatchStored(null, undefined)).toBe(true);
    expect(settingsMatchStored(null, { ...STUDY_SESSION_SETTINGS_DEFAULTS })).toBe(false);
  });

  it('Scenario: Omitted cardIds keeps full pool', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: Array.from({ length: 10 }, (_, i) => ({
        id: `card-${i}`,
        sortOrder: i,
        type: null,
      })),
    });
    prismaMock.studySession.findMany.mockResolvedValue([]);
    prismaMock.studySession.create.mockResolvedValue({
      id: 's-full',
      totalCards: 10,
      mode: 'LEARN',
    });

    await createSession('user-a', 'set-1', 'LEARN');
    const createArg = prismaMock.studySession.create.mock.calls[0]?.[0] as {
      data: { totalCards: number; sessionCards: { createMany: { data: unknown[] } } };
    };
    expect(createArg.data.totalCards).toBe(10);
    expect(createArg.data.sessionCards.createMany.data).toHaveLength(10);
  });

  it('Scenario: Subset materializes only those cards', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: Array.from({ length: 10 }, (_, i) => ({
        id: `c${i + 1}`,
        sortOrder: i,
        type: null,
      })),
    });
    prismaMock.studySession.findMany.mockResolvedValue([]);
    prismaMock.studySession.create.mockResolvedValue({ id: 's-sub', totalCards: 2, mode: 'LEARN' });

    await createSession('user-a', 'set-1', 'LEARN', undefined, ['c1', 'c2']);
    const createArg = prismaMock.studySession.create.mock.calls[0]?.[0] as {
      data: { sessionCards: { createMany: { data: Array<{ cardId: string }> } } };
    };
    const ids = createArg.data.sessionCards.createMany.data.map((row) => row.cardId).sort();
    expect(ids).toEqual(['c1', 'c2']);
  });

  it('Scenario: Empty cardIds rejected', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [{ id: 'c1', sortOrder: 0, type: null }],
    });
    await expect(createSession('user-a', 'set-1', 'LEARN', undefined, [])).rejects.toMatchObject({
      status: 400,
    });
  });

  it('Scenario: Resume matches same subset', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [
        { id: 'c1', sortOrder: 0, type: null },
        { id: 'c2', sortOrder: 1, type: null },
        { id: 'c3', sortOrder: 2, type: null },
      ],
    });
    prismaMock.studySession.findMany.mockResolvedValue([
      {
        id: 'newer-c3',
        settings: null,
        sessionCards: [{ cardId: 'c3' }],
        startedAt: new Date('2026-07-28T12:00:00.000Z'),
      },
      {
        id: 'older-c1c2',
        settings: null,
        sessionCards: [{ cardId: 'c1' }, { cardId: 'c2' }],
        startedAt: new Date('2026-07-28T11:00:00.000Z'),
      },
    ]);

    const { session } = await createSession('user-a', 'set-1', 'LEARN', undefined, ['c1', 'c2']);
    expect(session.id).toBe('older-c1c2');
    expect(prismaMock.studySession.create).not.toHaveBeenCalled();
  });

  it('Scenario: Different subset does not resume', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [
        { id: 'c1', sortOrder: 0, type: null },
        { id: 'c2', sortOrder: 1, type: null },
        { id: 'c3', sortOrder: 2, type: null },
      ],
    });
    prismaMock.studySession.findMany.mockResolvedValue([
      {
        id: 'subset-12',
        settings: null,
        sessionCards: [{ cardId: 'c1' }, { cardId: 'c2' }],
      },
    ]);
    prismaMock.studySession.create.mockResolvedValue({
      id: 'new-c3',
      totalCards: 1,
      mode: 'LEARN',
    });

    const { session } = await createSession('user-a', 'set-1', 'LEARN', undefined, ['c3']);
    expect(session.id).toBe('new-c3');
    expect(prismaMock.studySession.create).toHaveBeenCalled();
  });

  it('Scenario: Reject foreign cardIds', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [{ id: 'c1', sortOrder: 0, type: null }],
    });
    await expect(
      createSession('user-a', 'set-1', 'LEARN', undefined, ['foreign'])
    ).rejects.toMatchObject({ status: 400 });
  });

  it('Scenario: Full-set incomplete does not resume for subset Today CTA', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [
        { id: 'c1', sortOrder: 0, type: null },
        { id: 'c2', sortOrder: 1, type: null },
        { id: 'c3', sortOrder: 2, type: null },
      ],
    });
    prismaMock.studySession.findMany.mockResolvedValue([
      {
        id: 'full-incomplete',
        settings: null,
        sessionCards: [{ cardId: 'c1' }, { cardId: 'c2' }, { cardId: 'c3' }],
      },
    ]);
    prismaMock.studySession.create.mockResolvedValue({
      id: 'subset-new',
      totalCards: 2,
      mode: 'LEARN',
    });

    const { session } = await createSession('user-a', 'set-1', 'LEARN', undefined, ['c1', 'c2']);
    expect(session.id).toBe('subset-new');
    expect(prismaMock.studySession.create).toHaveBeenCalled();
  });

  it('test_study_session_completed: derives score from persisted answers', async () => {
    prismaMock.studySession.findUnique
      .mockResolvedValueOnce({
        id: 'session-1',
        userId: 'user-a',
        totalCards: 4,
        completedAt: null,
      })
      .mockResolvedValueOnce({
        id: 'session-1',
        userId: 'user-a',
        totalCards: 4,
        correctCount: 2,
        score: 0.5,
        completedAt: new Date(),
      });
    // correct answers, then live session-card total
    prismaMock.sessionCard.count.mockResolvedValueOnce(2).mockResolvedValueOnce(4);
    prismaMock.studySession.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.sessionCard.findMany.mockResolvedValue([{ cardId: 'card-1' }]);
    prismaMock.sessionCard.updateMany.mockResolvedValue({ count: 1 });

    const { session, streak } = await completeSession('session-1', 'user-a', [
      { cardId: 'card-1', isCorrect: false },
    ]);

    expect(session.score).toBe(0.5);
    expect(streak?.currentStreak).toBe(1);
    expect(recordDailyStudyActivity).toHaveBeenCalledWith('user-a');
    expect(prismaMock.studySession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1', completedAt: null },
        data: expect.objectContaining({
          correctCount: 2,
          score: 0.5,
        }),
      })
    );
  });

  it('completeSession: a card deleted mid-session does not block completion', async () => {
    prismaMock.studySession.findUnique
      .mockResolvedValueOnce({ id: 'session-1', userId: 'user-a', completedAt: null })
      .mockResolvedValueOnce({ id: 'session-1', userId: 'user-a', completedAt: new Date() });
    // card-gone was deleted: its SessionCard cascaded away.
    prismaMock.sessionCard.findMany.mockResolvedValue([{ cardId: 'card-1' }]);
    prismaMock.sessionCard.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.sessionCard.count.mockResolvedValueOnce(1).mockResolvedValueOnce(3);
    prismaMock.studySession.updateMany.mockResolvedValue({ count: 1 });

    await completeSession('session-1', 'user-a', [
      { cardId: 'card-1', isCorrect: true },
      { cardId: 'card-gone', isCorrect: true },
    ]);

    expect(prismaMock.sessionCard.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.sessionCard.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sessionId: 'session-1', cardId: 'card-1' } })
    );
    // Score uses the 3 cards still in the session.
    expect(prismaMock.studySession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ correctCount: 1, totalCards: 3, score: 1 / 3 }),
      })
    );
  });

  it('recordSessionAnswersBatch: records surviving answers when one card was deleted', async () => {
    prismaMock.studySession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-a',
      completedAt: null,
    });
    prismaMock.sessionCard.findMany.mockResolvedValue([{ cardId: 'card-1' }]);
    prismaMock.sessionCard.updateMany.mockResolvedValue({ count: 1 });

    const result = await recordSessionAnswersBatch('session-1', 'user-a', [
      { cardId: 'card-1', isCorrect: true },
      { cardId: 'card-gone', isCorrect: false },
    ]);

    expect(result).toEqual({ recorded: 1 });
  });

  it('recordSessionAnswersBatch: no-op for completed sessions', async () => {
    prismaMock.studySession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-a',
      completedAt: new Date(),
    });
    const result = await recordSessionAnswersBatch('session-1', 'user-a', [
      { cardId: 'card-1', isCorrect: true },
    ]);

    expect(result).toEqual({ recorded: 0, reason: 'session_already_completed' });
    expect(prismaMock.sessionCard.updateMany).not.toHaveBeenCalled();
  });

  it('test_resume_session_records_daily_streak: loads owned session and records activity', async () => {
    prismaMock.studySession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-a',
      mode: 'LEARN',
      sessionCards: [],
    });

    const { session, streak } = await getOwnedSessionForStudy('session-1', 'user-a');

    expect(session.id).toBe('session-1');
    expect(streak.currentStreak).toBe(1);
    expect(streak.changed).toBe(true);
    expect(recordDailyStudyActivity).toHaveBeenCalledWith('user-a');
  });

  it('test_resume_session_forbidden: rejects other users', async () => {
    prismaMock.studySession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-a',
      sessionCards: [],
    });

    await expect(getOwnedSessionForStudy('session-1', 'user-b')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(recordDailyStudyActivity).not.toHaveBeenCalled();
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
      presentation: 'multiple_choice' as const,
      mcDirection: 'front_to_back' as const,
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

  it('DRAW mode creates session with only new-word cards', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [
        { id: 'card-1', sortOrder: 0, type: 'new-word', front: '大', back: 'big' },
        { id: 'card-2', sortOrder: 1, type: null, front: 'b', back: 'b' },
        { id: 'card-3', sortOrder: 2, type: 'new-word', front: '水', back: 'water' },
        { id: 'card-4', sortOrder: 3, type: 'new-word', front: 'あ', back: 'a' },
      ],
    });

    prismaMock.studySession.create.mockResolvedValue({
      id: 'session-draw',
      totalCards: 3,
      mode: 'DRAW',
    });

    await createSession('user-a', 'set-1', 'DRAW');

    expect(prismaMock.studySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mode: 'DRAW',
          totalCards: 3,
          sessionCards: {
            createMany: {
              data: expect.arrayContaining([
                { cardId: 'card-1' },
                { cardId: 'card-3' },
                { cardId: 'card-4' },
              ]),
            },
          },
        }),
      })
    );
  });

  it('DRAW mode with zero new-word cards throws DRAW_NO_CARDS', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      cards: [
        { id: 'card-1', sortOrder: 0, type: null },
        { id: 'card-2', sortOrder: 1, type: null },
      ],
    });

    await expect(createSession('user-a', 'set-1', 'DRAW')).rejects.toMatchObject({
      code: 'DRAW_NO_CARDS',
      status: 422,
    });
  });
});
