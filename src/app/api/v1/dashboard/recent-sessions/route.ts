import { withErrorHandler } from '@/lib/api-error';
import { requireUserId } from '@/server/auth/auth-utils';
import { getRecentSessions } from '@/server/services/user/stats.service';

export const GET = withErrorHandler(async () => {
  const userId = await requireUserId();
  const sessions = await getRecentSessions(userId);
  return Response.json({ data: sessions });
});
