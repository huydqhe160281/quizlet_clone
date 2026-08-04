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
  getOwnedSessionForStudy,
  recordSessionAnswer,
  recordSessionAnswersBatch,
} from '@/server/services/study/study.service';

export const GET = withErrorHandler(async (_req, { params }) => {
  const { sessionId } = await params;
  const userId = await requireUserId();
  const { session, streak } = await getOwnedSessionForStudy(sessionId, userId);
  return Response.json({ data: session, streak });
});

export const PATCH = withErrorHandler(async (req, { params }) => {
  await assertApiRateLimit(req);
  const { sessionId } = await params;
  const userId = await requireUserId();
  const body = await req.json();

  // Batch-only flush (sendBeacon mid-session or unmount without completion)
  if ('answers' in body && !('correctCount' in body)) {
    const { answers } = batchAnswersSchema.parse(body);
    const result = await recordSessionAnswersBatch(sessionId, userId, answers);
    return Response.json({ data: result });
  }

  // Complete session — also flushes any remaining pending answers in one request
  if ('correctCount' in body) {
    const input = completeSessionWithAnswersSchema.parse(body);
    const { session, streak, alreadyCompleted } = await completeSession(
      sessionId,
      userId,
      input.answers ?? [],
      input.clientMutationId
    );
    return Response.json({ data: session, streak, alreadyCompleted });
  }

  // Legacy single-answer path (kept for backward compatibility)
  const input = recordAnswerSchema.parse(body);
  const result = await recordSessionAnswer(sessionId, userId, input.cardId, input.isCorrect);
  return Response.json({ data: result });
});
