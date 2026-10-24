/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  playCorrectFeedbackSound,
  playImpactFeedbackSound,
  playLaserChipSound,
  playLaserExplosionSound,
  resetStudyFeedbackSoundForTests,
} from './study-feedback-sound';

function mockAudioContext() {
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
    frequency: {
      value: 0,
      setValueAtTime,
      exponentialRampToValueAtTime,
    },
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

  return { ctx, start, stop };
}

describe('study-feedback-sound', () => {
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
    expect(() => playLaserChipSound()).not.toThrow();
    expect(() => playLaserExplosionSound()).not.toThrow();
    expect(() => playImpactFeedbackSound()).not.toThrow();
    window.AudioContext = original;
  });

  it('schedules 3 oscillators for playCorrectFeedbackSound', () => {
    const { ctx, start, stop } = mockAudioContext();

    playCorrectFeedbackSound();

    expect(ctx.createOscillator).toHaveBeenCalledTimes(3);
    expect(start).toHaveBeenCalledTimes(3);
    expect(stop).toHaveBeenCalledTimes(3);
  });

  it('schedules 1 rapid pulse oscillator for playLaserChipSound', () => {
    const { ctx, start, stop } = mockAudioContext();

    playLaserChipSound();

    expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('schedules chime + laser sweep + sub-bass for playLaserExplosionSound', () => {
    const { ctx, start, stop } = mockAudioContext();

    playLaserExplosionSound();

    expect(ctx.createOscillator).toHaveBeenCalledTimes(5);
    expect(start).toHaveBeenCalledTimes(5);
    expect(stop).toHaveBeenCalledTimes(5);
  });

  it('schedules sawtooth impact oscillator for playImpactFeedbackSound', () => {
    const { ctx, start, stop } = mockAudioContext();

    playImpactFeedbackSound();

    expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
