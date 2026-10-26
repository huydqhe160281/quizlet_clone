/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/render-with-locale';

const { pushMock, mutateMock, toastSuccess, useSetsCalls } = vi.hoisted(() => ({
  useSetsCalls: { count: 0 },
  pushMock: vi.fn(),
  mutateMock: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: toastSuccess },
}));

const listedSet = (id: string, title: string, cards: number) => ({
  id,
  title,
  description: null,
  language: null,
  visibility: 'PRIVATE',
  coverImage: null,
  userId: 'user-a',
  createdAt: '',
  updatedAt: '',
  _count: { cards },
  tags: [],
});

vi.mock('@/features/sets/hooks/useSets', () => ({
  useSets: () => {
    useSetsCalls.count += 1;
    return {
      data: {
        pages: [
          {
            data: [
              listedSet('s1', 'Vocab (1/5)', 10),
              listedSet('s2', 'Vocab (2/5)', 10),
              listedSet('s3', 'Vocab (3/5)', 8),
            ],
          },
        ],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    };
  },
  useSetMutations: () => ({ mergeSets: { mutate: mutateMock, isPending: false } }),
}));

import { MergeSetsDialog } from './MergeSetsDialog';

describe('MergeSetsDialog', () => {
  beforeEach(() => {
    pushMock.mockReset();
    mutateMock.mockReset();
    toastSuccess.mockReset();
    useSetsCalls.count = 0;
  });

  afterEach(cleanup);

  it('does not load the set list while closed', () => {
    renderWithLocale(
      <MergeSetsDialog open={false} onOpenChange={vi.fn()} initialSelection={[]} />,
      { locale: 'en' }
    );

    expect(useSetsCalls.count).toBe(0);
  });

  it('needs a second set before merging', () => {
    renderWithLocale(
      <MergeSetsDialog
        open
        onOpenChange={vi.fn()}
        initialSelection={[{ id: 's1', title: 'Vocab (1/5)', cardCount: 10 }]}
      />,
      { locale: 'en' }
    );

    expect(screen.getByText('Select at least 2 sets to merge.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge sets' })).toBeDisabled();
  });

  it('suggests a title from the picked parts and submits in pick order', () => {
    const onOpenChange = vi.fn();
    renderWithLocale(
      <MergeSetsDialog
        open
        onOpenChange={onOpenChange}
        initialSelection={[{ id: 's3', title: 'Vocab (3/5)', cardCount: 8 }]}
      />,
      { locale: 'en' }
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Vocab (1/5)' }));
    expect(screen.getByLabelText('New set name')).toHaveValue('Vocab (1, 3/5)');
    expect(screen.getByText('Selected: 2 sets · 18 cards')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Remove duplicate cards' }));
    fireEvent.click(screen.getByRole('button', { name: 'Merge sets' }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        setIds: ['s3', 's1'],
        title: 'Vocab (1, 3/5)',
        description: undefined,
        removeDuplicates: false,
      },
      expect.any(Object)
    );

    const { onSuccess } = mutateMock.mock.calls[0]![1] as {
      onSuccess: (result: { data: { id: string }; meta: { duplicatesSkipped: number } }) => void;
    };
    onSuccess({ data: { id: 'merged' }, meta: { duplicatesSkipped: 2 } });
    expect(toastSuccess).toHaveBeenCalledWith('Merged set created; skipped duplicate cards: 2.');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(pushMock).toHaveBeenCalledWith('/sets/merged');
  });

  it('explains the card limit error from the API', () => {
    renderWithLocale(
      <MergeSetsDialog
        open
        onOpenChange={vi.fn()}
        initialSelection={[
          { id: 's1', title: 'Vocab (1/5)', cardCount: 10 },
          { id: 's2', title: 'Vocab (2/5)', cardCount: 10 },
        ]}
      />,
      { locale: 'en' }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Merge sets' }));
    const { onError } = mutateMock.mock.calls[0]![1] as { onError: (error: Error) => void };
    // onError runs outside a React event handler here, so wrap the state update.
    act(() => onError(new Error('CARD_LIMIT_EXCEEDED')));
    expect(screen.getByText('A merged set can hold at most 5000 cards.')).toBeInTheDocument();
  });
});
