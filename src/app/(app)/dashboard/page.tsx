import { requireUserId } from '@/server/auth-utils';
import { getActivity, getRecentSessions, getStats } from '@/server/services/stats.service';
import { DashboardClient } from '@/features/dashboard/components/DashboardClient';

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [stats, activity, sessions] = await Promise.all([
    getStats(userId),
    getActivity(userId),
    getRecentSessions(userId),
  ]);

  return <DashboardClient stats={stats} activity={activity} sessions={sessions} />;
}
