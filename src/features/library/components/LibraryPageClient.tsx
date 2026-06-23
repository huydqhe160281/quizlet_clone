'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type SortOption = 'newest' | 'most_studied' | 'trending';

export function LibraryPageClient({
  initialData,
}: {
  initialData: {
    data: Array<{
      id: string;
      title: string;
      description: string | null;
      language: string | null;
      _count: { cards: number; studySessions: number };
    }>;
  };
}) {
  const [sort, setSort] = useState<SortOption>('newest');

  const { data, isLoading } = useQuery({
    queryKey: ['library', sort],
    queryFn: async () => {
      const response = await fetch(`/api/v1/library?sort=${sort}`);
      if (!response.ok) {
        throw new Error('Failed to load library');
      }
      return (await response.json()) as {
        data: Array<{
          id: string;
          title: string;
          description: string | null;
          language: string | null;
          _count: { cards: number; studySessions: number };
        }>;
      };
    },
    initialData: sort === 'newest' ? initialData : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Public library
        </h1>
        <p className="text-muted-foreground">Browse and duplicate public flashcard sets.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['newest', 'most_studied', 'trending'] as SortOption[]).map((option) => (
          <Button
            key={option}
            variant={sort === option ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSort(option)}
          >
            {option.replace('_', ' ')}
          </Button>
        ))}
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading library…</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((set) => (
          <Link
            key={set.id}
            href={`/shared/${set.id}`}
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
            <div className="relative z-10">
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                {set.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {set.description ?? 'No description'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                >
                  {set._count.cards} cards
                </Badge>
                {set.language && <Badge variant="outline">{set.language}</Badge>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
