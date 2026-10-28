import { ApiError, withErrorHandler } from '@/lib/api-error';
import { hasCronSecret } from '@/lib/cron-auth';
import { sendDailyStudyReminders } from '@/server/services/notifications/push.service';

export const maxDuration = 60;

/** Daily Vercel Cron (see vercel.json): push the study reminder to users who have not studied today. */
export const GET = withErrorHandler(async (req) => {
  if (!hasCronSecret(req)) {
    throw new ApiError('UNAUTHORIZED', 'Not authorized', 401);
  }

  const result = await sendDailyStudyReminders();
  console.info('[cron/study-reminder]', result);
  return Response.json({ data: result });
});
