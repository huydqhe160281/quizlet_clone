'use client';

type StatsCardsProps = {
  stats: {
    currentStreak: number;
    longestStreak: number;
    totalReviews: number;
    totalCards: number;
    accuracy: number;
    dueToday: number;
    totalSets: number;
  };
};

import { Flame, Trophy, Layers, Target, Clock, BookOpen, Hash } from 'lucide-react';

const items = (stats: StatsCardsProps['stats']) => [
  { label: 'Current streak', value: `${stats.currentStreak} days`, icon: Flame },
  { label: 'Longest streak', value: `${stats.longestStreak} days`, icon: Trophy },
  { label: 'Cards studied', value: stats.totalReviews.toString(), icon: Layers },
  { label: 'Accuracy', value: `${Math.round(stats.accuracy * 100)}%`, icon: Target },
  { label: 'Due today', value: stats.dueToday.toString(), icon: Clock },
  { label: 'Total sets', value: stats.totalSets.toString(), icon: BookOpen },
  { label: 'Total cards', value: stats.totalCards.toString(), icon: Hash },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items(stats).map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="group rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 shadow-sm transition-all hover:shadow-md hover:bg-card/80 overflow-hidden relative"
        >
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground relative z-10">
            {Icon && <Icon className="h-4 w-4 text-primary/70" />}
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent relative z-10">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
