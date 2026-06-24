import type { Grade, StudyMode } from '@prisma/client';
import { ApiError } from '@/lib/api-error';
import { calculateSm2, gradeToSm2 } from '@/features/study/lib/sm2';
import { prisma } from '@/server/db';
import { recordReviewStats } from '@/server/services/stats.service';
import type { StudySessionSettings } from '@/features/study/schemas/study.schema';
const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const getOwnedOrPublicSet = async (setId: string, userId: string) => {
  const set = await prisma.flashcardSet.findUnique({
    where: { id: setId },
    include: { cards: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!set) {
    throw new ApiError('NOT_FOUND', 'Set not found', 404);
  }
  if (set.visibility === 'PRIVATE' && set.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'This set is private', 403);
  }
  if (set.cards.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'Set has no cards to study', 400);
  }

  return set;
};

const getOwnedSession = async (sessionId: string, userId: string) => {
  const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new ApiError('NOT_FOUND', 'Session not found', 404);
  }
  if (session.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'You do not have access to this session', 403);
  }
  return session;
};

export async function createSession(
  userId: string,
  setId: string,
  mode: StudyMode,
  settings?: StudySessionSettings
) {
  const set = await getOwnedOrPublicSet(setId, userId);
  const poolCards =
    mode === 'DRAW' ? set.cards.filter((card) => card.type === 'new-word') : set.cards;

  if (mode === 'DRAW' && poolCards.length === 0) {
    throw new ApiError(
      'DRAW_NO_CARDS',
      "Bộ thẻ này không có từ nào được đánh dấu là 'từ mới'. Hãy đánh dấu ít nhất một thẻ trước khi dùng chế độ Vẽ.",
      422
    );
  }

  // Respect randomize setting — default true for backward compat when no settings
  const shouldShuffle = settings ? settings.randomize : true;
  const cards = shouldShuffle ? shuffle(poolCards) : [...poolCards];

  return prisma.studySession.create({
    data: {
      userId,
      setId,
      mode,
      totalCards: cards.length,
      settings: settings ? (settings as object) : undefined,
      sessionCards: {
        create: cards.map((card) => ({ cardId: card.id })),
      },
    },
    include: {
      sessionCards: {
        include: { card: true },
        orderBy: { id: 'asc' },
      },
    },
  });
}

export async function getSessionCards(sessionId: string, userId: string) {
  await getOwnedSession(sessionId, userId);

  return prisma.sessionCard.findMany({
    where: { sessionId },
    include: { card: true },
    orderBy: { id: 'asc' },
  });
}

export async function recordSessionAnswer(
  sessionId: string,
  userId: string,
  cardId: string,
  isCorrect: boolean
) {
  await getOwnedSession(sessionId, userId);

  const sessionCard = await prisma.sessionCard.findFirst({
    where: { sessionId, cardId },
  });

  if (!sessionCard) {
    throw new ApiError('NOT_FOUND', 'Card not in session', 404);
  }

  return prisma.sessionCard.update({
    where: { id: sessionCard.id },
    data: { isCorrect, answeredAt: new Date() },
  });
}

export async function completeSession(sessionId: string, userId: string, correctCount: number) {
  const session = await getOwnedSession(sessionId, userId);

  const score = session.totalCards > 0 ? correctCount / session.totalCards : 0;

  return prisma.studySession.update({
    where: { id: sessionId },
    data: {
      completedAt: new Date(),
      correctCount,
      score,
    },
  });
}

export async function getDueCards(userId: string) {
  const now = new Date();

  const dueProgress = await prisma.cardProgress.findMany({
    where: { userId, dueDate: { lte: now } },
    include: {
      card: {
        include: {
          set: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  const progressCardIds = await prisma.cardProgress.findMany({
    where: { userId },
    select: { cardId: true },
  });
  const studiedIds = progressCardIds.map((row) => row.cardId);

  const newCards = await prisma.flashcard.findMany({
    where: {
      set: { userId },
      ...(studiedIds.length > 0 ? { id: { notIn: studiedIds } } : {}),
    },
    include: {
      set: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const progressItems = dueProgress.map((row) => ({
    cardId: row.cardId,
    front: row.card.front,
    back: row.card.back,
    setId: row.card.setId,
    setTitle: row.card.set.title,
    dueDate: row.dueDate.toISOString(),
    easeFactor: row.easeFactor,
    interval: row.interval,
    repetitions: row.repetitions,
  }));

  const newItems = newCards.map((card) => ({
    cardId: card.id,
    front: card.front,
    back: card.back,
    setId: card.setId,
    setTitle: card.set.title,
    dueDate: now.toISOString(),
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
  }));

  const data = [...progressItems, ...newItems];
  return { data, count: data.length };
}

export async function reviewCard(
  userId: string,
  cardId: string,
  grade: Grade,
  responseMs?: number
) {
  const card = await prisma.flashcard.findUnique({
    where: { id: cardId },
    include: { set: true },
  });

  if (!card) {
    throw new ApiError('NOT_FOUND', 'Card not found', 404);
  }
  if (card.set.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'You can only review your own cards', 403);
  }

  const existing = await prisma.cardProgress.findUnique({
    where: { userId_cardId: { userId, cardId } },
  });

  const current = {
    repetitions: existing?.repetitions ?? 0,
    easeFactor: existing?.easeFactor ?? 2.5,
    interval: existing?.interval ?? 0,
  };

  const sm2 = calculateSm2(current, gradeToSm2(grade));
  const isCorrect = grade === 'GOOD' || grade === 'EASY';

  const progress = await prisma.cardProgress.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: {
      userId,
      cardId,
      repetitions: sm2.repetitions,
      easeFactor: sm2.easeFactor,
      interval: sm2.interval,
      dueDate: sm2.nextDueDate,
      reviewCount: 1,
      lastReviewed: new Date(),
    },
    update: {
      repetitions: sm2.repetitions,
      easeFactor: sm2.easeFactor,
      interval: sm2.interval,
      dueDate: sm2.nextDueDate,
      reviewCount: { increment: 1 },
      lastReviewed: new Date(),
    },
  });

  await prisma.reviewHistory.create({
    data: { userId, cardId, grade, responseMs },
  });

  await recordReviewStats(userId, isCorrect);

  return {
    cardId,
    newInterval: progress.interval,
    newEaseFactor: progress.easeFactor,
    nextDueDate: progress.dueDate.toISOString(),
  };
}
