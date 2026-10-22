import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { getQueryClient } from '@/lib/query-client';
import { SetDetailClient } from '@/features/sets/components/SetDetailClient';
import { setKeys } from '@/features/sets/query-keys';
import { ApiError } from '@/lib/api-error';
import { requireUserId } from '@/server/auth/auth-utils';
import { countNewWordCards, getCards } from '@/server/services/sets/card.service';
import { getSet } from '@/server/services/sets/set.service';

/**
 * Sets up to this size ship their cards in the page payload. Larger ones (imports allow
 * 2000 cards) would bloat the HTML and delay the first byte, so their card list is
 * fetched by the client after hydration; the header only needs the counts.
 */
const INLINE_CARDS_LIMIT = 200;

type SetDetailPageProps = {
  params: Promise<{ setId: string }>;
};

export default async function SetDetailPage({ params }: SetDetailPageProps) {
  const { setId } = await params;
  const userId = await requireUserId();
  const queryClient = getQueryClient();
  let initialNewWordCount = 0;

  try {
    // In parallel: the count is only used once getSet has passed the access check.
    const [set, newWordCount] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: setKeys.detail(setId),
        queryFn: () => getSet(setId, userId),
      }),
      countNewWordCards(setId),
    ]);
    initialNewWordCount = newWordCount;

    if (set._count.cards <= INLINE_CARDS_LIMIT) {
      await queryClient.prefetchQuery({
        queryKey: setKeys.cards(setId),
        queryFn: () => getCards(setId, userId),
      });
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    // Other expected failures (e.g. 403 private set) render the client, which fetches
    // again and shows its own error state, as before.
    if (!(error instanceof ApiError)) throw error;
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SetDetailClient setId={setId} initialNewWordCount={initialNewWordCount} />
    </HydrationBoundary>
  );
}
