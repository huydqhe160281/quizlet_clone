'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type SortOption = 'newest' | 'most_studied' | 'trending';

type LibrarySet = {
  id: string;
  title: string;
  description: string | null;
  language: string | null;
  _count: { cards: number; studySessions: number };
};

type LibraryPage = {
  data: LibrarySet[];
  pagination: { nextCursor: string | null; hasMore: boolean };
};

const SORT_LABEL_KEY: Record<SortOption, string> = {
  newest: 'library.sortNewest',
  most_studied: 'library.sortMostStudied',
  trending: 'library.sortTrending',
};

export function LibraryPageClient({ initialData }: { initialData: LibraryPage }) {
  const t = useTranslations();
  const [sort, setSort] = useState<SortOption>('newest');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['library', sort],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ sort });
      if (pageParam) params.set('cursor', pageParam);
      const response = await fetch(`/api/v1/library?${params.toString()}`);
      if (!response.ok) {
        throw new Error(t('library.loadFailed'));
      }
      return (await response.json()) as LibraryPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? (lastPage.pagination.nextCursor ?? undefined) : undefined,
    initialData: sort === 'newest' ? { pages: [initialData], pageParams: [undefined] } : undefined,
  });

  const sets = data?.pages.flatMap((page) => page.data) ?? [];
  const showEmpty = !isLoading && !isError && sets.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          {t('library.title')}
        </h1>
        <p className="text-muted-foreground">{t('library.subtitle')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['newest', 'most_studied', 'trending'] as SortOption[]).map((option) => (
          <Button
            key={option}
            variant={sort === option ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSort(option)}
            disabled={isFetching && !isFetchingNextPage}
          >
            {t(SORT_LABEL_KEY[option])}
          </Button>
        ))}
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">{t('library.loading')}</p>}
      {isError && (
        <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('library.loadFailed')}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            {t('ui.retry')}
          </Button>
        </div>
      )}
      {showEmpty && (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{t('library.emptyTitle')}</p>
          <p className="mt-1">{t('library.emptyHint')}</p>
          <Button asChild size="sm" className="mt-3" variant="outline">
            <Link href="/sets">{t('library.goToMySets')}</Link>
          </Button>
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
                {set.description ?? t('ui.noDescription')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="transition-colors group-hover:bg-primary/10 group-hover:text-primary"
                >
                  {t('ui.cardsCount', { count: set._count.cards })}
                </Badge>
                <Badge variant="outline">
                  {t('ui.studiedCount', { count: set._count.studySessions })}
                </Badge>
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
            {isFetchingNextPage ? t('ui.loading') : t('ui.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
