import { withErrorHandler } from '@/lib/api-error';
import { requireUserId } from '@/server/auth/auth-utils';
import { getStreakSnapshot } from '@/server/services/user/stats.service';

export const GET = withErrorHandler(async () => {
  const userId = await requireUserId();
  const streak = await getStreakSnapshot(userId);
  return Response.json({ data: streak });
});
