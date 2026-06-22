'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DueCardsAlert() {
  const { data } = useQuery({
    queryKey: ['study', 'due-cards'],
    queryFn: async () => {
      const response = await fetch('/api/v1/study/due-cards');
      if (!response.ok) {
        return { count: 0 };
      }
      return (await response.json()) as { count: number };
    },
  });

  const count = data?.count ?? 0;
  if (count === 0) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <AlertCircle className="h-5 w-5 text-primary" />
        <div>
          <CardTitle className="text-base">{count} cards due today</CardTitle>
          <CardDescription>Keep your streak going with spaced repetition.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm">
          <Link href="/study">Start review</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
