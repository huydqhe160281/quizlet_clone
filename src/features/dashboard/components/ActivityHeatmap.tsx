'use client';

type ActivityHeatmapProps = {
  activity: Array<{ date: string; count: number }>;
};

export function ActivityHeatmap({ activity }: ActivityHeatmapProps) {
  const max = Math.max(...activity.map((item) => item.count), 1);
  const recent = activity.slice(-53 * 7);

  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl p-5 shadow-sm">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
      <h3 className="mb-5 text-lg font-semibold tracking-tight relative z-10">Study activity</h3>
      <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2 relative z-10">
        {recent.map((item) => {
          const intensity = item.count / max;
          return (
            <div
              key={item.date}
              title={`${item.date}: ${item.count} reviews`}
              className="h-3.5 w-3.5 rounded-[4px] transition-all hover:scale-125 hover:z-10 hover:shadow-sm"
              style={{
                backgroundColor: `hsl(221 83% 53% / ${Math.max(0.12, intensity)})`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
