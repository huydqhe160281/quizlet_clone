import { withErrorHandler } from '@/lib/api-error';
import { requireUserId } from '@/server/auth-utils';
import { getStats } from '@/server/services/stats.service';

export const GET = withErrorHandler(async () => {
  const userId = await requireUserId();
  const stats = await getStats(userId);
  return Response.json({ data: stats });
});
