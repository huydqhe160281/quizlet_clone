type StudyProgressProps = {
  current: number;
  total: number;
};

export function StudyProgress({ current, total }: StudyProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-2 w-48">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {current} / {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
