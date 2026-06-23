import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SessionCompleteProps = {
  mode: string;
  correctCount: number;
  total: number;
  reviewedCount?: number;
  setId: string;
};

export function SessionComplete({
  mode,
  correctCount,
  total,
  reviewedCount,
  setId,
}: SessionCompleteProps) {
  const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <Card className="glass-panel mx-auto max-w-md overflow-hidden rounded-2xl border-border/50 text-center shadow-lg">
      <CardHeader>
        <CardTitle>Session complete</CardTitle>
        <CardDescription>{mode} mode finished</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === 'FLASHCARD' ? (
          <p className="text-2xl font-semibold">
            {reviewedCount ?? total}/{total} cards reviewed
          </p>
        ) : (
          <p className="text-2xl font-semibold">
            {correctCount}/{total} correct ({scorePercent}%)
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href={`/sets/${setId}`}>Back to set</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sets">My sets</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
