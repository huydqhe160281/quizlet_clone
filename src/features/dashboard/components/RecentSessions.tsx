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
          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/40"
        >
          <div>
            <p className="font-medium">{session.set.title}</p>
            <p className="text-sm text-muted-foreground">{session.mode.toLowerCase()} mode</p>
          </div>
          <Badge variant="secondary">
            {session.score !== null
              ? `${Math.round(session.score * 100)}%`
              : `${session.correctCount}/${session.totalCards}`}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
