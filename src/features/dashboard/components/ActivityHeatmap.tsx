'use client';

type ActivityHeatmapProps = {
  activity: Array<{ date: string; count: number }>;
};

export function ActivityHeatmap({ activity }: ActivityHeatmapProps) {
  const max = Math.max(...activity.map((item) => item.count), 1);
  const recent = activity.slice(-53 * 7);

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-4 font-medium">Study activity</h3>
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
        {recent.map((item) => {
          const intensity = item.count / max;
          return (
            <div
              key={item.date}
              title={`${item.date}: ${item.count} reviews`}
              className="h-3 w-3 rounded-sm"
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
