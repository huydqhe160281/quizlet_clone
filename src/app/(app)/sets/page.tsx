import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { SetsListClient } from '@/features/sets/components/SetsListClient';
import { setKeys } from '@/features/sets/query-keys';
import { requireUserId } from '@/server/auth-utils';
import { getSets } from '@/server/services/set.service';

export default async function SetsPage() {
  const userId = await requireUserId();
  const queryClient = getQueryClient();

  await queryClient.prefetchInfiniteQuery({
    queryKey: setKeys.list(),
    queryFn: () => getSets(userId, { limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Awaited<ReturnType<typeof getSets>>) =>
      lastPage.pagination.nextCursor ?? undefined,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SetsListClient />
    </HydrationBoundary>
  );
}
