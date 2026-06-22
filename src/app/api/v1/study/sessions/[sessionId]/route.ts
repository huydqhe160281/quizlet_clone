import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit-guard';
import { completeSessionSchema, recordAnswerSchema } from '@/features/study/schemas/study.schema';
import { requireUserId } from '@/server/auth-utils';
import {
  completeSession,
  recordSessionAnswer,
  getSessionCards,
} from '@/server/services/study.service';
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

  if ('cardId' in body) {
    const input = recordAnswerSchema.parse(body);
    const result = await recordSessionAnswer(sessionId, userId, input.cardId, input.isCorrect);
    return Response.json({ data: result });
  }

  const input = completeSessionSchema.parse(body);
  const session = await completeSession(sessionId, userId, input.correctCount);
  return Response.json({ data: session });
});
