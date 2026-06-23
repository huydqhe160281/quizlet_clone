'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

type RecentSessionsProps = {
  sessions: Array<{
    id: string;
    mode: string;
    score: number | null;
    totalCards: number;
    correctCount: number;
    set: { id: string; title: string };
  }>;
};

export function RecentSessions({ sessions }: RecentSessionsProps) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No completed sessions yet.</p>;
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Link
          key={session.id}
          href={`/sets/${session.set.id}`}
          className="group flex items-center justify-between rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 transition-all hover:bg-card/80 hover:shadow-md hover:border-primary/20 relative overflow-hidden"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/0 transition-all group-hover:bg-primary" />
          <div className="ml-1">
            <p className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
              {session.set.title}
            </p>
            <p className="text-sm text-muted-foreground capitalize">{session.mode} mode</p>
          </div>
          <Badge
            variant="secondary"
            className="group-hover:bg-primary/10 group-hover:text-primary transition-colors"
          >
            {session.score !== null
              ? `${Math.round(session.score * 100)}%`
              : `${session.correctCount}/${session.totalCards}`}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
