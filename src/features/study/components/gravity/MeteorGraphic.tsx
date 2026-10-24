import { memo } from 'react';
import { cn } from '@/lib/utils';

const METEOR_SPRITE = "url('/images/gravity/meteor-sprite.webp')";

const CHIP_SPARK_OFFSETS = [
  { dx: '-22px', dy: '-14px' },
  { dx: '22px', dy: '-12px' },
  { dx: '-16px', dy: '18px' },
  { dx: '18px', dy: '16px' },
] as const;

const EMBERS = [
  { left: '36%', drift: '-6px', delay: 0 },
  { left: '50%', drift: '5px', delay: 0.73 },
  { left: '64%', drift: '-4px', delay: 1.46 },
] as const;

type MeteorGraphicProps = {
  danger: boolean;
  hitSeq: number;
  isPrimedToExplode: boolean;
  /** Offsets the flicker/ember loops so neighbouring meteors don't burn in sync. */
  phaseSeed: number;
};

/**
 * Burning meteor: a transparent sprite with two flickering flame layers, a glow and rising
 * embers. Every loop is a CSS animation on `transform`/`opacity`, so it runs on the
 * compositor and the component only re-renders when its props change.
 */
export const MeteorGraphic = memo(function MeteorGraphic({
  danger,
  hitSeq,
  isPrimedToExplode,
  phaseSeed,
}: MeteorGraphicProps) {
  const phaseDelay = `${-phaseSeed * 0.13}s`;

  return (
    <div className="relative mx-auto h-16 w-16 select-none sm:h-28 sm:w-28" aria-hidden="true">
      <div
        className={cn(
          'pointer-events-none absolute inset-x-3 bottom-1 top-3 rounded-full blur-xl will-change-transform',
          isPrimedToExplode
            ? 'bg-gradient-to-t from-emerald-400/85 via-amber-300/65 to-cyan-400/30'
            : danger
              ? 'bg-gradient-to-t from-rose-600/85 via-orange-500/60 to-transparent'
              : 'bg-gradient-to-t from-orange-500/75 via-amber-400/45 to-transparent'
        )}
        style={{ animation: `gravityGlowPulse 0.62s ease-in-out ${phaseDelay} infinite alternate` }}
      />

      <div
        className={cn(
          'pointer-events-none absolute bottom-[18%] left-1/2 h-[28%] w-[30%] -translate-x-1/2 rounded-full blur-[2px]',
          isPrimedToExplode
            ? 'bg-amber-500/45 shadow-[0_0_28px_rgba(52,211,153,0.95),0_0_16px_rgba(251,191,36,0.9)]'
            : 'bg-orange-500/40 shadow-[0_0_22px_rgba(249,115,22,0.95)]'
        )}
      />

      {/* Upper flame tongue */}
      <div
        className="pointer-events-none absolute inset-0 origin-bottom bg-contain bg-center bg-no-repeat opacity-75 will-change-transform"
        style={{
          backgroundImage: METEOR_SPRITE,
          WebkitMaskImage: 'radial-gradient(ellipse 40% 42% at 50% 38%, #000 45%, transparent 90%)',
          maskImage: 'radial-gradient(ellipse 40% 42% at 50% 38%, #000 45%, transparent 90%)',
          animation: `gravityFlameUpper 0.26s ease-in-out ${phaseDelay} infinite alternate`,
        }}
      />

      {/* Rock body + main fire trail */}
      <div
        className="pointer-events-none relative h-full w-full origin-bottom bg-contain bg-center bg-no-repeat will-change-transform"
        style={{
          backgroundImage: METEOR_SPRITE,
          animation: `gravityFlameMain 0.22s ease-in-out ${phaseDelay} infinite alternate`,
        }}
      />

      {EMBERS.map((ember, index) => (
        <span
          key={index}
          className="pointer-events-none absolute bottom-[52%] h-1.5 w-1.5 rounded-full bg-amber-200 opacity-0 shadow-[0_0_8px_#f97316]"
          style={{
            left: ember.left,
            ['--ember-drift' as string]: ember.drift,
            animation: `gravityEmber 2.2s linear ${-(ember.delay + phaseSeed * 0.4)}s infinite`,
          }}
        />
      ))}

      {/* Hit flash + flying chips, replayed on every keystroke aimed at this meteor */}
      {hitSeq > 0 && (
        <div
          key={hitSeq}
          className="pointer-events-none absolute inset-0"
          style={{ animation: 'gravityChipFlash 260ms ease-out forwards' }}
        >
          <div className="absolute bottom-[16%] left-1/2 h-9 w-9 -translate-x-1/2 rounded-full bg-gradient-to-t from-cyan-200 via-amber-200 to-orange-500/80 blur-[3px]" />
          {CHIP_SPARK_OFFSETS.map((chip, index) => (
            <span
              key={index}
              className="absolute bottom-[26%] left-1/2 h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_8px_#38bdf8,0_0_12px_#f97316]"
              style={{ transform: `translate(${chip.dx}, ${chip.dy})` }}
            />
          ))}
        </div>
      )}
    </div>
  );
});
