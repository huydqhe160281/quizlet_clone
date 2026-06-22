'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DueCardsAlert({ dueCount }: { dueCount: number }) {
  if (dueCount === 0) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <AlertCircle className="h-5 w-5 text-primary" />
        <div>
          <CardTitle className="text-base">{dueCount} cards due today</CardTitle>
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
