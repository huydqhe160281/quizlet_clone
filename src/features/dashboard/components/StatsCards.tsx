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

const items = (stats: StatsCardsProps['stats']) => [
  { label: 'Current streak', value: `${stats.currentStreak} days` },
  { label: 'Longest streak', value: `${stats.longestStreak} days` },
  { label: 'Cards studied', value: stats.totalReviews.toString() },
  { label: 'Accuracy', value: `${Math.round(stats.accuracy * 100)}%` },
  { label: 'Due today', value: stats.dueToday.toString() },
  { label: 'Total sets', value: stats.totalSets.toString() },
  { label: 'Total cards', value: stats.totalCards.toString() },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items(stats).map(({ label, value }) => (
        <div key={label} className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}
