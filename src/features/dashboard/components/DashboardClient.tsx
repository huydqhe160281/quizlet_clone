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
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground">Your study overview and progress.</p>
      </div>
      <DueCardsAlert dueCount={stats.dueToday} />
      <StatsCards stats={stats} />
      <ActivityHeatmap activity={activity} />
      <div className="glass-panel relative overflow-hidden rounded-2xl p-5 shadow-sm">
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
        <h3 className="mb-5 text-lg font-semibold tracking-tight relative z-10">Recent sessions</h3>
        <div className="relative z-10">
          <RecentSessions sessions={sessions} />
        </div>
      </div>
    </div>
  );
}
