import { withErrorHandler } from '@/lib/api-error';
import { assertCanStartStudy } from '@/server/auth/email-verified';
import { requireUserId } from '@/server/auth/auth-utils';
import { getDueCards } from '@/server/services/study/study.service';

export const GET = withErrorHandler(async () => {
  const userId = await requireUserId();
  // Opening the spaced-review queue counts as starting study; reviews themselves are never gated.
  await assertCanStartStudy(userId);
  const result = await getDueCards(userId);
  return Response.json(result);
});
