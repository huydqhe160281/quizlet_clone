'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EmptyStatePanel } from '@/components/shared/EmptyStatePanel';
import { LoadMoreButton } from '@/components/shared/LoadMoreButton';
import { PageHeader } from '@/components/shared/PageHeader';
import { QueryErrorPanel } from '@/components/shared/QueryErrorPanel';
import { Button } from '@/components/ui/button';
import { SetCard } from '@/components/shared/SetCard';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { useNavReselectRefetch } from '@/lib/navigation/use-nav-reselect-refetch';

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

  useNavReselectRefetch('/library', refetch);

  return (
    <div className="space-y-6">
      <PageHeader title={t('library.title')} subtitle={t('library.subtitle')} />
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
        <QueryErrorPanel
          message={error instanceof Error ? error.message : t('library.loadFailed')}
          onRetry={refetch}
        />
      )}
      {showEmpty && (
        <EmptyStatePanel
          title={t('library.emptyTitle')}
          description={t('library.emptyHint')}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/sets">{t('library.goToMySets')}</Link>
            </Button>
          }
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => (
          <SetCard
            key={set.id}
            href={`/shared/${set.id}`}
            title={set.title}
            description={set.description}
            cardsCount={set._count.cards}
            studiedCount={set._count.studySessions}
            language={set.language}
          />
        ))}
      </div>
      <LoadMoreButton
        hasMore={hasNextPage ?? false}
        isLoading={isFetchingNextPage}
        onLoadMore={fetchNextPage}
      />
    </div>
  );
}
