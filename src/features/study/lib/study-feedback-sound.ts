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

/** Short, crisp plasma bolt tick when typing characters to chip-shoot a meteor. */
export function playLaserChipSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1280, start);
    osc.frequency.exponentialRampToValueAtTime(360, start + 0.055);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.09, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.065);
  } catch {
    // Autoplay / unsupported — ignore.
  }
}

/** Sci-fi laser zap + explosion punch + ascending chime when blasting a meteor. */
export function playLaserExplosionSound(): void {
  playCorrectFeedbackSound();
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const start = ctx.currentTime;

    // 1. Sci-fi laser sweep (high to low)
    const laserOsc = ctx.createOscillator();
    const laserGain = ctx.createGain();
    laserOsc.type = 'triangle';
    laserOsc.frequency.setValueAtTime(980, start);
    laserOsc.frequency.exponentialRampToValueAtTime(140, start + 0.14);

    laserGain.gain.setValueAtTime(0.0001, start);
    laserGain.gain.linearRampToValueAtTime(0.18, start + 0.01);
    laserGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);

    laserOsc.connect(laserGain);
    laserGain.connect(ctx.destination);
    laserOsc.start(start);
    laserOsc.stop(start + 0.16);

    // 2. Sub-bass impact thud
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, start + 0.04);
    subOsc.frequency.exponentialRampToValueAtTime(38, start + 0.28);

    subGain.gain.setValueAtTime(0.0001, start + 0.04);
    subGain.gain.linearRampToValueAtTime(0.22, start + 0.06);
    subGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(start + 0.04);
    subOsc.stop(start + 0.32);
  } catch {
    // Autoplay / unsupported — ignore.
  }
}

/** Low descending tone when a meteor impacts or an answer misses. */
export function playImpactFeedbackSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, start);
    osc.frequency.exponentialRampToValueAtTime(75, start + 0.26);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.14, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  } catch {
    // Autoplay / unsupported — ignore.
  }
}
