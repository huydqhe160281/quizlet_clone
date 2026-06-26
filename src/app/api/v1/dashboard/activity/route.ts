import { withErrorHandler } from '@/lib/api-error';
import { requireUserId } from '@/server/auth/auth-utils';
import { getActivity } from '@/server/services/user/stats.service';

export const GET = withErrorHandler(async () => {
  const userId = await requireUserId();
  const activity = await getActivity(userId);
  return Response.json({ data: activity });
});
