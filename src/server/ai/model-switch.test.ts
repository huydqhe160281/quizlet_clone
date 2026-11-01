import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_MODEL_ATTEMPTS, withModelSwitch } from '@/server/ai/model-switch';

describe('withModelSwitch', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the first model that succeeds', async () => {
    const fn = vi.fn().mockResolvedValueOnce('from-a');
    await expect(withModelSwitch(['a', 'b'], fn)).resolves.toBe('from-a');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('switches model on error and never retries the same model', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('429'), { statusCode: 429 }))
      .mockRejectedValueOnce(new Error('Unexpected output shape'))
      .mockResolvedValueOnce('from-c');

    await expect(withModelSwitch(['a', 'b', 'c'], fn)).resolves.toBe('from-c');
    expect(fn.mock.calls.map((call) => call[0])).toEqual(['a', 'b', 'c']);
  });

  it(`stops after ${MAX_MODEL_ATTEMPTS} attempts and throws the last error`, async () => {
    const fn = vi.fn(async (model: string) => {
      throw new Error(`${model} failed`);
    });

    await expect(withModelSwitch(['a', 'b', 'c', 'd', 'e'], fn)).rejects.toThrow('c failed');
    expect(fn).toHaveBeenCalledTimes(MAX_MODEL_ATTEMPTS);
  });

  it('fails when no model is configured', async () => {
    await expect(withModelSwitch([], vi.fn())).rejects.toThrow('No AI model configured');
  });

  it('aborts a hung attempt after attemptTimeoutMs and switches model', async () => {
    vi.useFakeTimers();
    const fn = vi.fn((model: string, signal: AbortSignal) =>
      model === 'a'
        ? new Promise<string>((_, reject) =>
            signal.addEventListener('abort', () => reject(signal.reason))
          )
        : Promise.resolve('from-b')
    );

    const promise = withModelSwitch(['a', 'b'], fn, { attemptTimeoutMs: 1_000 });
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(promise).resolves.toBe('from-b');
  });

  it('does not abort a result after it resolved (streams keep running)', async () => {
    vi.useFakeTimers();
    let captured: AbortSignal | undefined;
    await withModelSwitch(
      ['a'],
      async (_model, signal) => {
        captured = signal;
        return 'ok';
      },
      { attemptTimeoutMs: 1_000 }
    );
    await vi.advanceTimersByTimeAsync(5_000);
    expect(captured?.aborted).toBe(false);
  });

  it('stops switching once the total budget is spent', async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      throw new Error('slow failure');
    });

    const promise = withModelSwitch(['a', 'b', 'c'], fn, { totalBudgetMs: 1_000 });
    const assertion = expect(promise).rejects.toThrow('slow failure');
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not try another model when the caller aborted', async () => {
    const controller = new AbortController();
    const fn = vi.fn(async () => {
      controller.abort(new Error('client gone'));
      throw new Error('aborted');
    });

    await expect(withModelSwitch(['a', 'b'], fn, { signal: controller.signal })).rejects.toThrow(
      'client gone'
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
