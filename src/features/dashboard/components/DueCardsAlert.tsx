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
    <Card className="relative overflow-hidden rounded-2xl border-primary/30 bg-primary/5 backdrop-blur-sm shadow-md">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-3 relative z-10">
        <div className="rounded-full bg-primary/20 p-2 text-primary">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <CardTitle className="text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {dueCount} cards due today
          </CardTitle>
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
