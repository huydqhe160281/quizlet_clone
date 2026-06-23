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
    return (
      <div className="glass-panel animate-pulse rounded-2xl p-8 text-sm text-muted-foreground">
        Loading sets…
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <Card className="glass-panel overflow-hidden rounded-2xl border-border/50 shadow-lg">
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
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            My Sets
          </h1>
          <p className="text-muted-foreground">Manage and study your flashcard collections.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="shadow-sm">
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
            <Card className="h-full relative overflow-hidden rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md group">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
              <CardHeader className="relative z-10">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                    {set.title}
                  </CardTitle>
                  <Layers className="h-5 w-5 shrink-0 text-primary/70 transition-transform group-hover:scale-110" />
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
