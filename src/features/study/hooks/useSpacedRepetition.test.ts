/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const enqueueMutationMock = vi.hoisted(() => vi.fn());

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'user-a' } } }),
}));
vi.mock('@/features/study-offline/queue', () => ({ enqueueMutation: enqueueMutationMock }));

import { useSubmitReview } from '@/features/study/hooks/useSpacedRepetition';

describe('useSubmitReview', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    enqueueMutationMock.mockReset().mockResolvedValue(true);
  });

  it('queues a rate-limited review for replay instead of dropping it', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 429 }));
    const { result } = renderHook(() => useSubmitReview());

    await expect(result.current('card-1', 'GOOD')).resolves.toEqual({ status: 'queued' });
    expect(enqueueMutationMock).toHaveBeenCalledWith(
      'user-a',
      'srs-review',
      { cardId: 'card-1', grade: 'GOOD' },
      expect.any(String),
      expect.any(Number)
    );
  });

  it('sends reviews one at a time, in grading order', async () => {
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const { cardId } = JSON.parse(String(init?.body)) as { cardId: string };
      order.push(`start:${cardId}`);
      if (cardId === 'card-1') {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      }
      order.push(`end:${cardId}`);
      return Response.json({ data: {} });
    });
    const { result } = renderHook(() => useSubmitReview());

    const first = result.current('card-1', 'AGAIN');
    const second = result.current('card-2', 'GOOD');
    await vi.waitFor(() => expect(order).toEqual(['start:card-1']));
    releaseFirst();
    await Promise.all([first, second]);

    expect(order).toEqual(['start:card-1', 'end:card-1', 'start:card-2', 'end:card-2']);
  });
});
