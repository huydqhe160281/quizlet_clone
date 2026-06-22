'use client';

import Link from 'next/link';
import { Layers, Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSets } from '@/features/sets/hooks/useSets';

export function SetsListClient() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useSets();
  const sets = data?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading sets…</p>;
  }

  if (sets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No sets yet</CardTitle>
          <CardDescription>Create your first flashcard set to get started.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild>
            <Link href="/sets/new">
              <Plus className="mr-2 h-4 w-4" />
              Create set
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sets/import">
              <Upload className="mr-2 h-4 w-4" />
              Import set
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Sets</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/sets/import">
              <Upload className="mr-2 h-4 w-4" />
              Import set
            </Link>
          </Button>
          <Button asChild>
            <Link href="/sets/new">
              <Plus className="mr-2 h-4 w-4" />
              New set
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => (
          <Link key={set.id} href={`/sets/${set.id}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-lg">{set.title}</CardTitle>
                  <Layers className="h-5 w-5 shrink-0 text-primary" />
                </div>
                <CardDescription className="line-clamp-2">
                  {set.description ?? 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Badge variant="secondary">{set._count.cards} cards</Badge>
                <Badge variant="outline">{set.visibility.toLowerCase()}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {hasNextPage && (
        <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  );
}
