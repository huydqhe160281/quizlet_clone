'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

export function SearchPageClient() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['search-page', submitted || 'all'],
    queryFn: async () => {
      const url =
        submitted.length > 0
          ? `/api/v1/search?q=${encodeURIComponent(submitted)}`
          : '/api/v1/library?sort=newest';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load sets');
      }
      return (await response.json()) as { data: PublicSetItem[] };
    },
  });

  const isSearching = submitted.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search public sets</h1>
        <p className="text-muted-foreground">
          Browse community sets or search by title and description.
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
      {error && <p className="text-sm text-destructive">Could not load sets.</p>}
      {!isLoading && !error && data?.data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {isSearching ? 'No sets match your search.' : 'No public sets yet.'}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((set) => (
          <Link
            key={set.id}
            href={`/shared/${set.id}`}
            className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <h3 className="font-semibold">{set.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {set.description ?? 'No description'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {set._count && <Badge variant="secondary">{set._count.cards} cards</Badge>}
              {set.language && <Badge variant="outline">{set.language}</Badge>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
