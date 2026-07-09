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
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-lg text-muted-foreground font-medium">
          Your study overview and progress.
        </p>
      </div>
      <DueCardsAlert dueCount={stats.dueToday} />
      <StatsCards stats={stats} />
      <ActivityHeatmap activity={activity} />
      <div className="glass-panel relative overflow-hidden rounded-[2rem] p-6 shadow-xl dark:shadow-none mt-8 border-white/20 dark:border-white/5">
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <h3 className="mb-6 text-xl font-bold tracking-tight relative z-10 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Recent sessions
        </h3>
        <div className="relative z-10">
          <RecentSessions sessions={sessions} />
        </div>
      </div>
    </div>
  );
}
