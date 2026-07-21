'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type PublicSetItem = {
  id: string;
  title: string;
  description: string | null;
  language: string | null;
  _count?: { cards: number; studySessions: number };
};

type SetsPage = {
  data: PublicSetItem[];
  pagination: { nextCursor: string | null; hasMore: boolean };
};

export function SearchPageClient({ initialData }: { initialData: SetsPage }) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const isSearching = submitted.length > 0;

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: isSearching ? ['search-page', submitted] : ['library', 'newest'],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        if (isSearching) {
          params.set('q', submitted);
        } else {
          params.set('sort', 'newest');
        }
        if (pageParam) params.set('cursor', pageParam);

        const url = isSearching
          ? `/api/v1/search?${params.toString()}`
          : `/api/v1/library?${params.toString()}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to load sets');
        }
        return (await response.json()) as SetsPage;
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.pagination.hasMore ? (lastPage.pagination.nextCursor ?? undefined) : undefined,
      initialData: !isSearching ? { pages: [initialData], pageParams: [undefined] } : undefined,
    });

  const sets = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Search public sets
        </h1>
        <p className="text-muted-foreground">
          Browse community sets or search by title and description. Signed-in users also see their
          own matching sets.
        </p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(query.trim());
        }}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title or description…"
        />
        <Button type="submit">Search</Button>
        {isSearching && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuery('');
              setSubmitted('');
            }}
          >
            Clear
          </Button>
        )}
      </form>
      <p className="text-sm text-muted-foreground">
        {isSearching ? `Results for “${submitted}”` : 'Showing all public sets (newest first)'}
      </p>
      {isLoading && (
        <p className="text-sm text-muted-foreground">
          {isSearching ? 'Searching…' : 'Loading sets…'}
        </p>
      )}
      {error && (
        <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">Could not load sets. Try again.</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}
      {!isLoading && !error && sets.length === 0 && (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            {isSearching ? 'No sets match your search' : 'No public sets yet'}
          </p>
          <p className="mt-1">
            {isSearching
              ? 'Try a shorter keyword or clear the search to browse newest sets.'
              : 'Publish a set to make it discoverable.'}
          </p>
          {isSearching && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setQuery('');
                setSubmitted('');
              }}
            >
              Browse newest
            </Button>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => (
          <Link
            key={set.id}
            href={`/shared/${set.id}`}
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
            <div className="relative z-10">
              <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">
                {set.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {set.description ?? 'No description'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {set._count && (
                  <Badge
                    variant="secondary"
                    className="transition-colors group-hover:bg-primary/10 group-hover:text-primary"
                  >
                    {set._count.cards} cards
                  </Badge>
                )}
                {set.language && <Badge variant="outline">{set.language}</Badge>}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
