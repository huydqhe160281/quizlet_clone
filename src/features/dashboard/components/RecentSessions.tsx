'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

type RecentSessionsProps = {
  sessions: Array<{
    id: string;
    mode: string;
    /** Accuracy at completion (correct/total). Null while in progress. */
    score: number | null;
    /** Explicit alias of `score` — accuracy, not progress. */
    accuracy?: number | null;
    totalCards: number;
    correctCount: number;
    answeredCount?: number;
    /** answeredCount / totalCards (0–1). */
    progress?: number;
    completedAt: string | Date | null;
    set: { id: string; title: string };
  }>;
};

function formatSessionDate(value: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  if (sessions.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Chưa có phiên học nào.</p>
        <p className="text-xs text-muted-foreground/80">
          Sau mỗi vòng học, tiến độ (ví dụ 10%, 70%) sẽ hiện tại đây. Học hết phiên để đánh dấu hoàn
          thành.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const answeredCount = session.answeredCount ?? session.correctCount;
        const progress =
          session.progress ?? (session.totalCards > 0 ? answeredCount / session.totalCards : 0);
        const progressPercent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
        const isComplete = Boolean(session.completedAt);
        const dateLabel = formatSessionDate(session.completedAt);
        const accuracy = session.accuracy ?? session.score;
        const accuracyPercent =
          accuracy != null ? Math.round(Math.min(1, Math.max(0, accuracy)) * 100) : null;

        return (
          <Link
            key={session.id}
            href={
              isComplete
                ? `/sets/${session.set.id}`
                : `/sets/${session.set.id}/${session.mode.toLowerCase()}?sessionId=${session.id}`
            }
            className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-border/40 bg-background/40 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/60 hover:shadow-md"
          >
            <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary/0 transition-all duration-300 group-hover:bg-primary" />
            <div className="z-10 ml-1 min-w-0">
              <p className="truncate font-semibold text-card-foreground transition-colors group-hover:text-primary">
                {session.set.title}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="capitalize">{session.mode.toLowerCase()}</span> mode
                {` · ${answeredCount}/${session.totalCards} thẻ`}
                {isComplete && accuracyPercent != null ? ` · ${accuracyPercent}% đúng` : ''}
                {dateLabel ? ` · ${dateLabel}` : ''}
                {` · ${isComplete ? 'Đã xong' : 'Đang học'}`}
              </p>
            </div>
            <Badge
              variant={isComplete ? 'secondary' : 'outline'}
              className="ml-3 shrink-0 transition-colors group-hover:bg-primary/10 group-hover:text-primary"
              title="Tiến độ (đã trả lời / tổng thẻ)"
            >
              {progressPercent}%
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}
