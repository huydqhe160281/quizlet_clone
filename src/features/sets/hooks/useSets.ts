'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateSetInput, UpdateSetInput } from '@/features/sets/schemas/set.schema';
import {
  fetchCards,
  fetchSet,
  fetchSets,
  type FlashcardItem,
  type FlashcardSetSummary,
} from '@/features/sets/api/sets-api';
import { setKeys } from '@/features/sets/query-keys';

export { setKeys };

export function useSets() {
  return useInfiniteQuery({
    queryKey: setKeys.list(),
    queryFn: ({ pageParam }) => fetchSets(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
  });
}

export function useSet(setId: string) {
  return useQuery({
    queryKey: setKeys.detail(setId),
    queryFn: () => fetchSet(setId),
  });
}

export function useCards(setId: string) {
  return useQuery({
    queryKey: setKeys.cards(setId),
    queryFn: () => fetchCards(setId),
  });
}

export function useSetMutations() {
  const queryClient = useQueryClient();

  const invalidateSets = () => {
    void queryClient.invalidateQueries({ queryKey: setKeys.all });
  };

  const createSet = useMutation({
    mutationFn: async (input: CreateSetInput) => {
      const response = await fetch('/api/v1/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? 'Failed to create set');
      }
      return (await response.json()) as { data: FlashcardSetSummary };
    },
    onSuccess: invalidateSets,
  });

  const updateSet = useMutation({
    mutationFn: async ({ setId, input }: { setId: string; input: UpdateSetInput }) => {
      const response = await fetch(`/api/v1/sets/${setId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? 'Failed to update set');
      }
      return (await response.json()) as { data: FlashcardSetSummary };
    },
    onMutate: async ({ setId, input }) => {
      await queryClient.cancelQueries({ queryKey: setKeys.detail(setId) });
      const previous = queryClient.getQueryData<FlashcardSetSummary>(setKeys.detail(setId));
      if (previous) {
        queryClient.setQueryData(setKeys.detail(setId), { ...previous, ...input });
      }
      return { previous };
    },
    onError: (_error, { setId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(setKeys.detail(setId), context.previous);
      }
    },
    onSettled: (_data, _error, { setId }) => {
      void queryClient.invalidateQueries({ queryKey: setKeys.detail(setId) });
      invalidateSets();
    },
  });

  const deleteSet = useMutation({
    mutationFn: async (setId: string) => {
      const response = await fetch(`/api/v1/sets/${setId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete set');
      }
    },
    onSuccess: invalidateSets,
  });

  const duplicateSet = useMutation({
    mutationFn: async (setId: string) => {
      const response = await fetch(`/api/v1/sets/${setId}/duplicate`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to duplicate set');
      }
      return (await response.json()) as { data: FlashcardSetSummary };
    },
    onSuccess: invalidateSets,
  });

  const createCard = useMutation({
    mutationFn: async ({
      setId,
      input,
    }: {
      setId: string;
      input: {
        front: string;
        back: string;
        example?: string;
        imageUrl?: string;
        audioUrl?: string;
        type?: 'new-word' | null;
      };
    }) => {
      const response = await fetch(`/api/v1/sets/${setId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('Failed to create card');
      }
      return (await response.json()) as { data: FlashcardItem };
    },
    onMutate: async ({ setId, input }) => {
      await queryClient.cancelQueries({ queryKey: setKeys.cards(setId) });
      const previous = queryClient.getQueryData<FlashcardItem[]>(setKeys.cards(setId));
      const optimistic: FlashcardItem = {
        id: `temp-${Date.now()}`,
        setId,
        front: input.front,
        back: input.back,
        example: input.example ?? null,
        imageUrl: null,
        audioUrl: null,
        type: input.type ?? null,
        sortOrder: previous?.length ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData(setKeys.cards(setId), [...(previous ?? []), optimistic]);
      return { previous };
    },
    onError: (_error, { setId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(setKeys.cards(setId), context.previous);
      }
    },
    onSettled: (_data, _error, { setId }) => {
      void queryClient.invalidateQueries({ queryKey: setKeys.cards(setId) });
      void queryClient.invalidateQueries({ queryKey: setKeys.detail(setId) });
    },
  });

  const deleteCard = useMutation({
    mutationFn: async ({ setId, cardId }: { setId: string; cardId: string }) => {
      const response = await fetch(`/api/v1/sets/${setId}/cards/${cardId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete card');
      }
    },
    onMutate: async ({ setId, cardId }) => {
      await queryClient.cancelQueries({ queryKey: setKeys.cards(setId) });
      const previous = queryClient.getQueryData<FlashcardItem[]>(setKeys.cards(setId));
      queryClient.setQueryData(
        setKeys.cards(setId),
        (previous ?? []).filter((card) => card.id !== cardId)
      );
      return { previous };
    },
    onError: (_error, { setId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(setKeys.cards(setId), context.previous);
      }
    },
    onSettled: (_data, _error, { setId }) => {
      void queryClient.invalidateQueries({ queryKey: setKeys.cards(setId) });
      void queryClient.invalidateQueries({ queryKey: setKeys.detail(setId) });
    },
  });

  const deleteCards = useMutation({
    mutationFn: async ({ setId, cardIds }: { setId: string; cardIds: string[] }) => {
      const response = await fetch(`/api/v1/sets/${setId}/cards`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds }),
      });
      if (!response.ok) {
        throw new Error('Failed to delete cards');
      }
    },
    onMutate: async ({ setId, cardIds }) => {
      await queryClient.cancelQueries({ queryKey: setKeys.cards(setId) });
      const previous = queryClient.getQueryData<FlashcardItem[]>(setKeys.cards(setId));
      const cardIdsSet = new Set(cardIds);
      queryClient.setQueryData(
        setKeys.cards(setId),
        (previous ?? []).filter((card) => !cardIdsSet.has(card.id))
      );
      return { previous };
    },
    onError: (_error, { setId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(setKeys.cards(setId), context.previous);
      }
    },
    onSettled: (_data, _error, { setId }) => {
      void queryClient.invalidateQueries({ queryKey: setKeys.cards(setId) });
      void queryClient.invalidateQueries({ queryKey: setKeys.detail(setId) });
    },
  });

  const reorderCards = useMutation({
    mutationFn: async ({ setId, cardIds }: { setId: string; cardIds: string[] }) => {
      const response = await fetch(`/api/v1/sets/${setId}/cards/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds }),
      });
      if (!response.ok) {
        throw new Error('Failed to reorder cards');
      }
      return (await response.json()) as { data: FlashcardItem[] };
    },
    onSuccess: (result, { setId }) => {
      queryClient.setQueryData(setKeys.cards(setId), result.data);
    },
  });

  const updateCard = useMutation({
    mutationFn: async ({
      setId,
      cardId,
      input,
    }: {
      setId: string;
      cardId: string;
      input: { type?: 'new-word' | null };
    }) => {
      const response = await fetch(`/api/v1/sets/${setId}/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('Failed to update card');
      }
      return (await response.json()) as { data: FlashcardItem };
    },
    onMutate: async ({ setId, cardId, input }) => {
      await queryClient.cancelQueries({ queryKey: setKeys.cards(setId) });
      const previous = queryClient.getQueryData<FlashcardItem[]>(setKeys.cards(setId));
      queryClient.setQueryData(
        setKeys.cards(setId),
        (previous ?? []).map((card) =>
          card.id === cardId ? { ...card, ...input, updatedAt: new Date().toISOString() } : card
        )
      );
      return { previous };
    },
    onError: (_error, { setId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(setKeys.cards(setId), context.previous);
      }
    },
    onSettled: (_data, _error, { setId }) => {
      void queryClient.invalidateQueries({ queryKey: setKeys.cards(setId) });
      void queryClient.invalidateQueries({ queryKey: setKeys.detail(setId) });
    },
  });

  return {
    createSet,
    updateSet,
    deleteSet,
    duplicateSet,
    createCard,
    updateCard,
    deleteCard,
    deleteCards,
    reorderCards,
  };
}
