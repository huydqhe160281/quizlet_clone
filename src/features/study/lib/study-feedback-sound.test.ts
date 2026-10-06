/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playCorrectFeedbackSound, resetStudyFeedbackSoundForTests } from './study-feedback-sound';

describe('playCorrectFeedbackSound', () => {
  afterEach(() => {
    resetStudyFeedbackSoundForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not throw when AudioContext is unavailable', () => {
    const original = window.AudioContext;
    // @ts-expect-error intentional remove for test
    delete window.AudioContext;
    expect(() => playCorrectFeedbackSound()).not.toThrow();
    window.AudioContext = original;
  });

  it('schedules oscillators when AudioContext is available', () => {
    const connect = vi.fn();
    const start = vi.fn();
    const stop = vi.fn();
    const setValueAtTime = vi.fn();
    const linearRampToValueAtTime = vi.fn();
    const exponentialRampToValueAtTime = vi.fn();

    const gain = {
      gain: { setValueAtTime, linearRampToValueAtTime, exponentialRampToValueAtTime },
      connect,
    };
    const osc = {
      type: 'sine',
      frequency: { value: 0 },
      connect,
      start,
      stop,
    };

    const ctx = {
      state: 'running' as const,
      currentTime: 0,
      resume: vi.fn(),
      createOscillator: vi.fn(() => osc),
      createGain: vi.fn(() => gain),
      destination: {},
    };

    vi.stubGlobal(
      'AudioContext',
      vi.fn(function AudioContextMock(this: unknown) {
        return ctx;
      }) as unknown as typeof AudioContext
    );

    playCorrectFeedbackSound();

    expect(ctx.createOscillator).toHaveBeenCalledTimes(3);
    expect(start).toHaveBeenCalledTimes(3);
    expect(stop).toHaveBeenCalledTimes(3);
  });
});
