import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { getQueryClient } from '@/lib/query-client';
import { SetDetailClient } from '@/features/sets/components/SetDetailClient';
import { setKeys } from '@/features/sets/query-keys';
import { ApiError } from '@/lib/api-error';
import { requireUserId } from '@/server/auth-utils';
import { getCards } from '@/server/services/card.service';
import { getSet } from '@/server/services/set.service';

type SetDetailPageProps = {
  params: Promise<{ setId: string }>;
};

export default async function SetDetailPage({ params }: SetDetailPageProps) {
  const { setId } = await params;
  const userId = await requireUserId();
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: setKeys.detail(setId),
      queryFn: () => getSet(setId, userId),
    });
    await queryClient.prefetchQuery({
      queryKey: setKeys.cards(setId),
      queryFn: () => getCards(setId, userId),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SetDetailClient setId={setId} />
    </HydrationBoundary>
  );
}
