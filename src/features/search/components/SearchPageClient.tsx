'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EmptyStatePanel } from '@/components/shared/EmptyStatePanel';
import { LoadMoreButton } from '@/components/shared/LoadMoreButton';
import { PageHeader } from '@/components/shared/PageHeader';
import { QueryErrorPanel } from '@/components/shared/QueryErrorPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SetCard } from '@/components/shared/SetCard';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { useNavReselectRefetch } from '@/lib/navigation/use-nav-reselect-refetch';

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
  const t = useTranslations();
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
          throw new Error(t('searchPage.loadFailed'));
        }
        return (await response.json()) as SetsPage;
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.pagination.hasMore ? (lastPage.pagination.nextCursor ?? undefined) : undefined,
      initialData: !isSearching ? { pages: [initialData], pageParams: [undefined] } : undefined,
    });

  const sets = data?.pages.flatMap((page) => page.data) ?? [];

  useNavReselectRefetch('/search', refetch);

  return (
    <div className="space-y-6">
      <PageHeader title={t('searchPage.title')} subtitle={t('searchPage.subtitle')} />
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
          placeholder={t('searchPage.placeholder')}
        />
        <Button type="submit">{t('ui.search')}</Button>
        {isSearching && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuery('');
              setSubmitted('');
            }}
          >
            {t('ui.clear')}
          </Button>
        )}
      </form>
      <p className="text-sm text-muted-foreground">
        {isSearching
          ? t('searchPage.resultsFor', { query: submitted })
          : t('searchPage.showingAll')}
      </p>
      {isLoading && (
        <p className="text-sm text-muted-foreground">
          {isSearching ? t('searchPage.searching') : t('searchPage.loadingSets')}
        </p>
      )}
      {error && <QueryErrorPanel message={t('searchPage.loadFailed')} onRetry={refetch} />}
      {!isLoading && !error && sets.length === 0 && (
        <EmptyStatePanel
          title={isSearching ? t('searchPage.noMatchTitle') : t('searchPage.emptyTitle')}
          description={isSearching ? t('searchPage.noMatchHint') : t('searchPage.emptyHint')}
          action={
            isSearching ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setQuery('');
                  setSubmitted('');
                }}
              >
                {t('searchPage.browseNewest')}
              </Button>
            ) : undefined
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
            cardsCount={set._count?.cards}
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
