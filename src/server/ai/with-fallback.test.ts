import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageModel } from 'ai';
import { withModelFallback } from '@/server/ai/with-fallback';

const modelA = { id: 'a' } as unknown as LanguageModel;
const modelB = { id: 'b' } as unknown as LanguageModel;

describe('withModelFallback', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries a model, then falls back to the next one', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('a1'))
      .mockRejectedValueOnce(new Error('a2'))
      .mockResolvedValueOnce('from-b');

    await expect(
      withModelFallback(
        [
          ['a', modelA],
          ['b', modelB],
        ],
        fn,
        { maxAttempts: 2 }
      )
    ).resolves.toBe('from-b');
    expect(fn.mock.calls.map((call) => call[0])).toEqual([modelA, modelA, modelB]);
  });

  it('skips remaining attempts on a non-retryable error (e.g. unknown model)', async () => {
    const fatal = Object.assign(new Error('model not found'), { isRetryable: false });
    const fn = vi.fn().mockRejectedValueOnce(fatal).mockResolvedValueOnce('from-b');

    await withModelFallback(
      [
        ['a', modelA],
        ['b', modelB],
      ],
      fn,
      { maxAttempts: 3 }
    );

    expect(fn.mock.calls.map((call) => call[0])).toEqual([modelA, modelB]);
  });

  it('aborts a hung attempt after attemptTimeoutMs and moves on', async () => {
    vi.useFakeTimers();
    const fn = vi.fn((model: LanguageModel, signal: AbortSignal) =>
      model === modelA
        ? new Promise<string>((_, reject) =>
            signal.addEventListener('abort', () => reject(signal.reason))
          )
        : Promise.resolve('from-b')
    );

    const promise = withModelFallback(
      [
        ['a', modelA],
        ['b', modelB],
      ],
      fn,
      { maxAttempts: 1, attemptTimeoutMs: 1_000 }
    );
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(promise).resolves.toBe('from-b');
  });

  it('stops the cascade once the total budget is spent', async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      throw new Error('slow failure');
    });

    const promise = withModelFallback(
      [
        ['a', modelA],
        ['b', modelB],
      ],
      fn,
      { maxAttempts: 5, totalBudgetMs: 1_000 }
    );
    const assertion = expect(promise).rejects.toThrow('slow failure');
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;

    // 10 attempts would be possible without a budget; the deadline cuts it to 2.
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('keeps accepting a plain attempts number', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('x'));
    await expect(withModelFallback([['a', modelA]], fn, 3)).rejects.toThrow('x');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
