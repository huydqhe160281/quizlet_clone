import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import {
  batchAnswersSchema,
  completeSessionWithAnswersSchema,
  recordAnswerSchema,
} from '@/features/study/schemas/study.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import {
  completeSession,
  recordSessionAnswer,
  recordSessionAnswersBatch,
  getSessionCards,
} from '@/server/services/study/study.service';
import { prisma } from '@/server/db';
import { ApiError } from '@/lib/api-error';

export const GET = withErrorHandler(async (req, { params }) => {
  const { sessionId } = await params;
  const userId = await requireUserId();

  const session = await prisma.studySession.findUnique({
    where: { id: sessionId },
    include: {
      sessionCards: {
        include: { card: true },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!session) {
    throw new ApiError('NOT_FOUND', 'Session not found', 404);
  }
  if (session.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'Access denied', 403);
  }

  return Response.json({ data: session });
});

export const PATCH = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { sessionId } = await params;
  const userId = await requireUserId();
  const body = await req.json();

  // Batch-only flush (sendBeacon mid-session or unmount without completion)
  if ('answers' in body && !('correctCount' in body)) {
    const { answers } = batchAnswersSchema.parse(body);
    await recordSessionAnswersBatch(sessionId, userId, answers);
    return Response.json({ data: { recorded: answers.length } });
  }

  // Complete session — also flushes any remaining pending answers in one request
  if ('correctCount' in body) {
    const input = completeSessionWithAnswersSchema.parse(body);
    if (input.answers && input.answers.length > 0) {
      await recordSessionAnswersBatch(sessionId, userId, input.answers);
    }
    const session = await completeSession(sessionId, userId, input.correctCount);
    return Response.json({ data: session });
  }

  // Legacy single-answer path (kept for backward compatibility)
  const input = recordAnswerSchema.parse(body);
  const result = await recordSessionAnswer(sessionId, userId, input.cardId, input.isCorrect);
  return Response.json({ data: result });
});
