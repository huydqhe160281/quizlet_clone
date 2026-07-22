'use client';

import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/PageHeader';
import { DueCardsAlert } from '@/features/dashboard/components/DueCardsAlert';
import { StatsCards } from '@/features/dashboard/components/StatsCards';
import { RecentSessions } from '@/features/dashboard/components/RecentSessions';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

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
    /** Accuracy at completion — not progress. */
    score: number | null;
    accuracy?: number | null;
    totalCards: number;
    correctCount: number;
    answeredCount?: number;
    progress?: number;
    completedAt: string | Date | null;
    set: { id: string; title: string };
  }>;
};

export function DashboardClient({ stats, activity, sessions }: DashboardClientProps) {
  const t = useTranslations();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={t('dashboardPage.title')}
        subtitle={t('dashboardPage.subtitle')}
        size="lg"
      />

      <DueCardsAlert dueCount={stats.dueToday} />
      <StatsCards stats={stats} />
      <ActivityHeatmap activity={activity} />

      <div className="glass-panel relative overflow-hidden rounded-xl border-white/20 p-5 shadow-sm dark:border-white/5 dark:shadow-none">
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <h3 className="relative z-10 mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {t('dashboardPage.recentSessions')}
        </h3>
        <div className="relative z-10">
          <RecentSessions sessions={sessions} />
        </div>
      </div>
    </div>
  );
}
