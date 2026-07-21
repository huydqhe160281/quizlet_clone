'use client';

import { Flame, Trophy, Layers, Target, Clock, BookOpen, Hash, CheckCircle2 } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type StatsCardsProps = {
  stats: {
    currentStreak: number;
    longestStreak: number;
    totalReviews: number;
    totalCorrect: number;
    totalCards: number;
    accuracy: number;
    dueToday: number;
    totalSets: number;
  };
};

export function StatsCards({ stats }: StatsCardsProps) {
  const t = useTranslations();

  const items = [
    {
      label: t('dashboard.currentStreak'),
      value: t('dashboard.days', { count: stats.currentStreak }),
      icon: Flame,
    },
    {
      label: t('dashboard.longestStreak'),
      value: t('dashboard.days', { count: stats.longestStreak }),
      icon: Trophy,
    },
    { label: t('dashboard.cardsStudied'), value: stats.totalReviews.toString(), icon: Layers },
    {
      label: t('dashboard.accuracy'),
      value: `${Math.round(stats.accuracy * 100)}%`,
      icon: Target,
    },
    { label: t('dashboard.dueToday'), value: stats.dueToday.toString(), icon: Clock },
    { label: t('dashboard.totalSets'), value: stats.totalSets.toString(), icon: BookOpen },
    { label: t('dashboard.totalCards'), value: stats.totalCards.toString(), icon: Hash },
    {
      label: t('dashboard.correctAnswers'),
      value: stats.totalCorrect.toString(),
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="glass-panel group relative overflow-hidden rounded-xl p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl sm:p-5"
        >
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:bg-primary/20" />
          <p className="relative z-10 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Icon className="h-4 w-4 text-primary/70" />
            {label}
          </p>
          <p className="relative z-10 mt-3 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold text-transparent">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
