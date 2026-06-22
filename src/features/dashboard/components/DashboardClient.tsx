'use client';

import dynamic from 'next/dynamic';
import { DueCardsAlert } from '@/features/dashboard/components/DueCardsAlert';
import { StatsCards } from '@/features/dashboard/components/StatsCards';
import { RecentSessions } from '@/features/dashboard/components/RecentSessions';

const ActivityHeatmap = dynamic(
  () => import('@/features/dashboard/components/ActivityHeatmap').then((m) => m.ActivityHeatmap),
  {
    ssr: false,
    loading: () => <div className="h-32 animate-pulse rounded-xl border bg-muted/40" aria-hidden />,
  }
);

type DashboardClientProps = {
  stats: {
    currentStreak: number;
    longestStreak: number;
    totalReviews: number;
    totalCorrect: number;
    accuracy: number;
    totalSets: number;
    totalCards: number;
    dueToday: number;
  };
  activity: Array<{ date: string; count: number }>;
  sessions: Array<{
    id: string;
    mode: string;
    score: number | null;
    totalCards: number;
    correctCount: number;
    set: { id: string; title: string };
  }>;
};

export function DashboardClient({ stats, activity, sessions }: DashboardClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your study overview and progress.</p>
      </div>
      <DueCardsAlert dueCount={stats.dueToday} />
      <StatsCards stats={stats} />
      <ActivityHeatmap activity={activity} />
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-4 font-medium">Recent sessions</h3>
        <RecentSessions sessions={sessions} />
      </div>
    </div>
  );
}
