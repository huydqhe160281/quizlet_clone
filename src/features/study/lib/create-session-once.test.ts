import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearCreateSessionCache,
  createStudySessionOnce,
} from '@/features/study/lib/create-session-once';

describe('createStudySessionOnce', () => {
  afterEach(() => {
    clearCreateSessionCache();
    vi.unstubAllGlobals();
  });

  it('shares one POST across concurrent callers', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          ok: true,
          json: async () => ({
            data: {
              id: 'session-1',
              sessionCards: [],
              set: { id: 'set-1', title: 'Set' },
            },
          }),
        };
      })
    );

    const [a, b] = await Promise.all([
      createStudySessionOnce('set-1', 'LEARN'),
      createStudySessionOnce('set-1', 'LEARN'),
    ]);

    expect(calls).toBe(1);
    expect(a.data.id).toBe('session-1');
    expect(b.data.id).toBe('session-1');
  });

  it('Scenario: Client cache distinguishes subsets', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: { id: 'session-x', sessionCards: [], set: { id: 'set-1', title: 'Set' } },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await createStudySessionOnce('set-1', 'LEARN', undefined, ['c1']);
    await createStudySessionOnce('set-1', 'LEARN', undefined, ['c2']);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body0 = JSON.parse(
      String((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body)
    ) as {
      cardIds: string[];
    };
    const body1 = JSON.parse(
      String((fetchMock.mock.calls[1] as unknown as [string, { body: string }])[1].body)
    ) as {
      cardIds: string[];
    };
    expect(body0.cardIds).toEqual(['c1']);
    expect(body1.cardIds).toEqual(['c2']);
  });

  it('posts sorted cardIds regardless of input order', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          id: 'session-sorted',
          sessionCards: [],
          set: { id: 'set-1', title: 'Set' },
        },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await createStudySessionOnce('set-1', 'LEARN', undefined, ['c2', 'c1']);

    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body)
    ) as { cardIds: string[] };
    expect(body.cardIds).toEqual(['c1', 'c2']);
  });
});
