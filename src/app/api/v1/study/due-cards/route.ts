import { withErrorHandler } from '@/lib/api-error';
import { requireUserId } from '@/server/auth/auth-utils';
import { getDueCards } from '@/server/services/study/study.service';

export const GET = withErrorHandler(async () => {
  const userId = await requireUserId();
  const result = await getDueCards(userId);
  return Response.json(result);
});
