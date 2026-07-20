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
            data: { id: 'session-1', sessionCards: [] },
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

  it('reuses ready result within TTL', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: { id: 'session-2', sessionCards: [] },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await createStudySessionOnce('set-1', 'FLASHCARD');
    await createStudySessionOnce('set-1', 'FLASHCARD');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
