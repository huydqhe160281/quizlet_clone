import { withErrorHandler } from '@/lib/api-error';
import { requireUserId } from '@/server/auth/auth-utils';
import { getSessionCards } from '@/server/services/study/study.service';

export const GET = withErrorHandler(async (_req, { params }) => {
  const { sessionId } = await params;
  const userId = await requireUserId();
  const cards = await getSessionCards(sessionId, userId);
  return Response.json({ data: cards });
});
