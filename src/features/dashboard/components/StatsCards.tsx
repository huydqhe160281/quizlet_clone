'use client';

import { Flame, Trophy, Layers, Target, Clock, BookOpen, Hash, CheckCircle2 } from 'lucide-react';

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

const items = (stats: StatsCardsProps['stats']) => [
  { label: 'Current streak', value: `${stats.currentStreak} days`, icon: Flame },
  { label: 'Longest streak', value: `${stats.longestStreak} days`, icon: Trophy },
  { label: 'Cards studied', value: stats.totalReviews.toString(), icon: Layers },
  { label: 'Accuracy', value: `${Math.round(stats.accuracy * 100)}%`, icon: Target },
  { label: 'Due today', value: stats.dueToday.toString(), icon: Clock },
  { label: 'Total sets', value: stats.totalSets.toString(), icon: BookOpen },
  { label: 'Total cards', value: stats.totalCards.toString(), icon: Hash },
  { label: 'Correct answers', value: stats.totalCorrect.toString(), icon: CheckCircle2 },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items(stats).map(({ label, value, icon: Icon }) => (
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
