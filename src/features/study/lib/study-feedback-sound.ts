/** Short Quizlet-like ascending chime for correct answers (Web Audio, no asset). */

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let sharedCtx: AudioContext | null = null;

/** Clears the cached AudioContext — tests only. */
export function resetStudyFeedbackSoundForTests(): void {
  sharedCtx = null;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const AC = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AC) {
    return null;
  }
  sharedCtx ??= new AC();
  return sharedCtx;
}

/** C5 → E5 → G5 arpeggio with quick decay. Safe no-op if audio is unavailable. */
export function playCorrectFeedbackSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const notesHz = [523.25, 659.25, 783.99] as const;
    const start = ctx.currentTime;
    const step = 0.07;

    for (const [index, freq] of notesHz.entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const t0 = start + index * step;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.16, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    }
  } catch {
    // Autoplay / unsupported — ignore.
  }
}
