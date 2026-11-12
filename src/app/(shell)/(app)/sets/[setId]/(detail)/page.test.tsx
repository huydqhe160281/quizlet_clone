import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DehydratedState } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-error';

const getSet = vi.hoisted(() => vi.fn());
const getCards = vi.hoisted(() => vi.fn());
const countNewWordCards = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
);

vi.mock('@/server/auth/auth-utils', () => ({ requireUserId: vi.fn(async () => 'user-a') }));
vi.mock('@/server/services/sets/set.service', () => ({ getSet }));
vi.mock('@/server/services/sets/card.service', () => ({ getCards, countNewWordCards }));
vi.mock('@/features/sets/components/SetDetailClient', () => ({ SetDetailClient: () => null }));
vi.mock('next/navigation', () => ({ notFound }));
// React's `cache` is per-request on the server; a fresh client per call is the same here.
vi.mock('@/lib/query-client', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { getQueryClient: () => new QueryClient() };
});

import SetDetailPage from './page';

type Rendered = {
  props: {
    state: DehydratedState;
    children: { props: { setId: string; initialNewWordCount: number } };
  };
};

async function render() {
  return (await SetDetailPage({
    params: Promise.resolve({ setId: 'set-1' }),
  })) as unknown as Rendered;
}

const cachedKeys = (page: Rendered) =>
  page.props.state.queries.map((query) => JSON.stringify(query.queryKey));

describe('set detail page payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCards.mockResolvedValue([{ id: 'c1' }]);
    countNewWordCards.mockResolvedValue(7);
  });

  it('inlines the cards of a small set', async () => {
    getSet.mockResolvedValue({ id: 'set-1', _count: { cards: 20 } });

    const page = await render();

    expect(getCards).toHaveBeenCalled();
    expect(cachedKeys(page).some((key) => key.includes('cards'))).toBe(true);
  });

  it('leaves the card list of a large set to the client but passes the counts', async () => {
    getSet.mockResolvedValue({ id: 'set-1', _count: { cards: 2000 } });

    const page = await render();

    expect(getCards).not.toHaveBeenCalled();
    expect(cachedKeys(page).some((key) => key.includes('cards'))).toBe(false);
    expect(page.props.children.props.initialNewWordCount).toBe(7);
  });

  it('renders Next not-found for a missing set', async () => {
    getSet.mockRejectedValue(new ApiError('NOT_FOUND', 'Set not found', 404));
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('lets the client show its own error for a private set', async () => {
    getSet.mockRejectedValue(new ApiError('FORBIDDEN', 'This set is private', 403));
    const page = await render();
    expect(page.props.children.props.setId).toBe('set-1');
  });
});
