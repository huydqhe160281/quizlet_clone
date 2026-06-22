'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type StudyLauncherProps = {
  setId: string;
  cardCount: number;
};

export function StudyLauncher({ setId, cardCount }: StudyLauncherProps) {
  if (cardCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Study</CardTitle>
          <CardDescription>Add at least one card before studying.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Study this set</CardTitle>
        <CardDescription>
          Configure your mode, batch size, and options — then start a tracked session.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full sm:w-auto" id="study-settings-btn">
          <Link href={`/sets/${setId}/study`}>
            <BookOpen className="mr-2 h-4 w-4" />
            Study settings &rarr;
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
