/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FlashcardItem } from '@/features/sets/api/sets-api';
import { useSetMutations } from '@/features/sets/hooks/useSets';
import { setKeys } from '@/features/sets/query-keys';

function card(id: string, type: string | null = null): FlashcardItem {
  return {
    id,
    setId: 'set-1',
    front: id,
    back: 'b',
    example: null,
    imageUrl: null,
    audioUrl: null,
    type,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(setKeys.cards('set-1'), [card('c1'), card('c2')]);
  queryClient.setQueryData(setKeys.detail('set-1'), { id: 'set-1' });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSetMutations(), { wrapper });
  return { queryClient, result };
}

describe('updateCard (CardEditor type toggle)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes the saved card into the cache without refetching cards or detail', async () => {
    const saved = { ...card('c1', 'new-word'), updatedAt: '2026-02-02T00:00:00.000Z' };
    const fetchMock = vi.fn(async () => Response.json({ data: saved }));
    vi.stubGlobal('fetch', fetchMock);
    const { queryClient, result } = setup();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.updateCard.mutateAsync({
        setId: 'set-1',
        cardId: 'c1',
        input: { type: 'new-word' },
      });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
    const cards = queryClient.getQueryData<FlashcardItem[]>(setKeys.cards('set-1'));
    expect(cards?.[0]).toEqual(saved);
    expect(cards?.[1]?.id).toBe('c2');
  });

  it('rolls back the optimistic toggle when the save fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 }))
    );
    const { queryClient, result } = setup();

    act(() => {
      result.current.updateCard.mutate({
        setId: 'set-1',
        cardId: 'c1',
        input: { type: 'new-word' },
      });
    });

    await waitFor(() => expect(result.current.updateCard.isError).toBe(true));
    const cards = queryClient.getQueryData<FlashcardItem[]>(setKeys.cards('set-1'));
    expect(cards?.[0]?.type).toBeNull();
  });
});
