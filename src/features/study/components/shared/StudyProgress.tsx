type StudyProgressProps = {
  current: number;
  total: number;
  label?: string;
  fullWidth?: boolean;
};

export function StudyProgress({
  current,
  total,
  label = 'Tiến trình',
  fullWidth,
}: StudyProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={fullWidth ? 'w-full space-y-2' : 'w-48 space-y-2'}>
      <div className="flex justify-between text-xs font-semibold text-muted-foreground">
        <span>{label}</span>
        <span>
          {current} / {total} thẻ · {percent}%
        </span>
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
