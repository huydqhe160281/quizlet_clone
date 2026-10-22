import { describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-error';
import { activateWaitingWorker, ACTIVATE_RELOAD_FALLBACK_MS } from '@/features/pwa/update-prompt';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

const chunkError = Object.assign(new Error('Loading chunk 812 failed.'), {
  name: 'ChunkLoadError',
});

describe('chunk load errors', () => {
  it('recognises webpack and dynamic-import chunk failures only', () => {
    expect(isChunkLoadError(chunkError)).toBe(true);
    expect(
      isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /x.js'))
    ).toBe(true);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError('Loading chunk 1 failed')).toBe(false);
  });

  it('reloads once, then stops so a persistent failure cannot loop', () => {
    const storage = memoryStorage();
    const reload = vi.fn();

    expect(reloadOnceForChunkError(chunkError, { storage, reload, now: 1_000 })).toBe(true);
    expect(reloadOnceForChunkError(chunkError, { storage, reload, now: 5_000 })).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);

    // A later deploy, well after the first reload, may reload again.
    expect(reloadOnceForChunkError(chunkError, { storage, reload, now: 120_000 })).toBe(true);
  });

  it('never reloads for other errors or without storage', () => {
    const reload = vi.fn();
    expect(reloadOnceForChunkError(new Error('boom'), { storage: memoryStorage(), reload })).toBe(
      false
    );
    const brokenStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {},
    };
    expect(reloadOnceForChunkError(chunkError, { storage: brokenStorage, reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('activateWaitingWorker', () => {
  it('reloads when the new worker takes control, not before', () => {
    const listeners: Array<() => void> = [];
    const serwist = {
      addEventListener: (_type: 'controlling', listener: () => void) => listeners.push(listener),
      messageSkipWaiting: vi.fn(),
    };
    const reload = vi.fn();
    const timers: Array<[() => void, number]> = [];

    activateWaitingWorker(serwist, reload, (fn, ms) => timers.push([fn, ms]));

    expect(serwist.messageSkipWaiting).toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();

    listeners.forEach((listener) => listener());
    timers.forEach(([fn]) => fn());
    expect(reload).toHaveBeenCalledTimes(1);
    expect(timers[0]?.[1]).toBe(ACTIVATE_RELOAD_FALLBACK_MS);
  });
});
