import { memo } from 'react';
import type { GravityPoppedEffect } from '@/features/study/lib/gravity-engine';
import { cn } from '@/lib/utils';

export type GravityLaserShot = {
  id: string;
  fromXPercent: number;
  fromYPercent: number;
  toXPercent: number;
  toYPercent: number;
  createdAtMs: number;
  kind: 'chip' | 'kill';
};

/** How long a beam stays on screen; the game loop drops shots older than this. */
export const LASER_SHOT_DURATION_MS = 280;
const LASER_FADE_MS = { chip: 190, kill: LASER_SHOT_DURATION_MS } as const;

export const TOTAL_SPACESHIP_SKINS = 12;

export function pickRandomShipSkin(excludeSkin?: number): number {
  const candidates = Array.from({ length: TOTAL_SPACESHIP_SKINS }, (_, i) => i + 1).filter(
    (skin) => skin !== excludeSkin
  );
  return candidates[Math.floor(Math.random() * candidates.length)] ?? 1;
}

/** Deterministic star positions so SSR/CSR and re-renders never flicker. */
const STARFIELD = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  left: `${((index * 37 + 13) % 94) + 3}%`,
  top: `${((index * 53 + 7) % 66) + 4}%`,
  size: (index % 3) + 1.5,
  delay: `${(index % 7) * 0.55}s`,
  opacity: 0.4 + (index % 5) * 0.14,
  isDiamond: index % 8 === 0,
}));

const SPARK_OFFSETS = [
  { dx: '-28px', dy: '-24px' },
  { dx: '30px', dy: '-20px' },
  { dx: '-34px', dy: '10px' },
  { dx: '34px', dy: '14px' },
  { dx: '-14px', dy: '-36px' },
  { dx: '18px', dy: '-34px' },
] as const;

export const GravityStarfield = memo(function GravityStarfield() {
  return (
    <>
      {STARFIELD.map((star) =>
        star.isDiamond ? (
          <span
            key={star.id}
            aria-hidden="true"
            className="pointer-events-none absolute animate-pulse text-[12px] leading-none text-sky-200 drop-shadow-[0_0_8px_rgba(186,230,253,0.95)]"
            style={{ left: star.left, top: star.top, animationDelay: star.delay }}
          >
            ✦
          </span>
        ) : (
          <span
            key={star.id}
            aria-hidden="true"
            className="pointer-events-none absolute animate-pulse rounded-full bg-white"
            style={{
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: star.delay,
            }}
          />
        )
      )}
    </>
  );
});

/** Plasma beams from the ship to a meteor; each fades out with a CSS animation. */
export const GravityLasers = memo(function GravityLasers({ shots }: { shots: GravityLaserShot[] }) {
  if (shots.length === 0) return null;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
    >
      {shots.map((shot) => {
        const isKill = shot.kind === 'kill';
        return (
          <g
            key={shot.id}
            style={{ animation: `gravityLaserFade ${LASER_FADE_MS[shot.kind]}ms linear forwards` }}
          >
            <line
              x1={shot.fromXPercent}
              y1={shot.fromYPercent}
              x2={shot.toXPercent}
              y2={shot.toYPercent}
              stroke={isKill ? '#f97316' : '#38bdf8'}
              strokeWidth={isKill ? '9' : '4'}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={isKill ? '0.85' : '0.7'}
            />
            <line
              x1={shot.fromXPercent}
              y1={shot.fromYPercent}
              x2={shot.toXPercent}
              y2={shot.toYPercent}
              stroke={isKill ? '#fef08a' : '#e0f2fe'}
              strokeWidth={isKill ? '3.5' : '1.8'}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
});

/** Exploding word + score (hit) or crater + lost heart (impact). */
export const GravityPoppedEffects = memo(function GravityPoppedEffects({
  effects,
}: {
  effects: GravityPoppedEffect[];
}) {
  return (
    <>
      {effects.map((pop) => (
        <div
          key={pop.id}
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ left: `${pop.xPercent}%`, top: `${pop.yPercent}%` }}
        >
          <div
            aria-hidden="true"
            className={cn(
              'absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2',
              pop.kind === 'impact'
                ? 'border-rose-400/80 bg-rose-600/30'
                : 'border-amber-300/75 bg-orange-500/20'
            )}
          />
          {SPARK_OFFSETS.map((spark, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                'absolute left-1/2 top-1/2 h-2 w-2 animate-ping rounded-full',
                pop.kind === 'impact'
                  ? 'bg-rose-400 shadow-[0_0_8px_#e11d48]'
                  : 'bg-amber-300 shadow-[0_0_8px_#f97316]'
              )}
              style={{ transform: `translate(${spark.dx}, ${spark.dy})` }}
            />
          ))}
          <div className="relative animate-bounce">
            <div
              className="text-3xl font-black tracking-wider text-[#fff7d6] sm:text-5xl"
              style={{
                textShadow:
                  pop.kind === 'impact'
                    ? '0 0 18px #e11d48, 0 0 34px #be123c, -2.5px -2.5px 0 #881337, 2.5px -2.5px 0 #881337, -2.5px 2.5px 0 #881337, 2.5px 2.5px 0 #881337'
                    : '0 0 18px #f97316, 0 0 34px #ea580c, -2.5px -2.5px 0 #7c2d12, 2.5px -2.5px 0 #7c2d12, -2.5px 2.5px 0 #7c2d12, 2.5px 2.5px 0 #7c2d12, 0 4px 0 #431407',
              }}
            >
              {pop.text}
            </div>
            {pop.kind === 'impact' ? (
              <span className="mt-1 inline-block rounded-full border border-rose-300 bg-rose-600 px-2.5 py-0.5 text-xs font-black text-white shadow-[0_0_14px_rgba(225,29,72,0.85)]">
                -1 ❤️
              </span>
            ) : (
              <span className="mt-1 inline-block rounded-full border border-amber-200 bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-xs font-black text-slate-950 shadow-[0_0_14px_rgba(251,191,36,0.8)]">
                +{pop.points}
              </span>
            )}
          </div>
        </div>
      ))}
    </>
  );
});

/**
 * The defender ship. Like the meteors it rides a full-width rail moved by
 * `translate3d(n%, 0, 0)`, and its recoil is a CSS animation replayed per shot.
 */
export function GravitySpaceship({
  skin,
  xPercent,
  aimAngleDeg,
  shotSeq,
}: {
  skin: number;
  xPercent: number;
  aimAngleDeg: number;
  shotSeq: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-[3.75rem] z-20 h-0 will-change-transform sm:bottom-[4.25rem]"
      style={{
        transform: `translate3d(${xPercent.toFixed(2)}%, 0, 0)`,
        transition: 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        data-testid="gravity-spaceship"
        data-ship-skin={skin}
        data-ship-shot-seq={shotSeq}
        className="absolute bottom-0 left-0 -translate-x-1/2"
      >
        <div style={{ transform: `rotate(${aimAngleDeg.toFixed(1)}deg)` }}>
          <div
            key={shotSeq}
            style={
              shotSeq > 0
                ? { animation: 'gravityShipRecoil 200ms cubic-bezier(0.36, 0.07, 0.19, 0.97)' }
                : undefined
            }
          >
            <div
              className="h-16 w-16 bg-contain bg-center bg-no-repeat drop-shadow-[0_0_14px_rgba(56,189,248,0.8)] sm:h-20 sm:w-20"
              style={{
                backgroundImage: `url('/images/gravity/ships/ship-${skin}.png')`,
                imageRendering: 'pixelated',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
