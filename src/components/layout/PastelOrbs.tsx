import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

type Orb = {
  className: string;
  /** HSL triplets: base tone and the deeper shade used for its 3D falloff. */
  tone: string;
  deep: string;
  delay?: string;
};

const PEACH = { tone: '20 85% 82%', deep: '14 60% 64%' };
const BLUE = { tone: '208 65% 84%', deep: '212 40% 62%' };
const CREAM = { tone: '38 70% 92%', deep: '28 45% 74%' };
const PINK = { tone: '345 65% 89%', deep: '345 35% 70%' };

const HERO_ORBS: Orb[] = [
  { className: 'left-[5%] top-28 h-24 w-24 max-md:hidden', ...PEACH },
  { className: 'right-[3%] top-60 h-28 w-28 max-md:hidden', ...BLUE, delay: '-3s' },
  { className: 'left-[12%] top-[26rem] h-12 w-12 max-md:hidden', ...CREAM, delay: '-5s' },
  { className: 'right-[18%] top-[30rem] h-16 w-16 max-md:hidden', ...PINK, delay: '-2s' },
  { className: 'right-[4%] top-[44rem] h-10 w-10', ...PEACH, delay: '-6s' },
];

const CORNER_ORBS: Orb[] = [
  { className: '-left-10 top-24 h-40 w-40 max-md:hidden', ...PEACH },
  { className: '-right-12 bottom-16 h-48 w-48', ...BLUE, delay: '-4s' },
  { className: 'right-[12%] top-16 h-14 w-14 max-md:hidden', ...PINK, delay: '-2s' },
];

/**
 * Floating clay spheres for the pastel theme. Hidden in every other theme,
 * so layouts can render it unconditionally.
 */
export function PastelOrbs({ variant = 'hero' }: { variant?: 'hero' | 'corners' }) {
  const orbs = variant === 'hero' ? HERO_ORBS : CORNER_ORBS;
  return (
    <div aria-hidden className="decor-orbs pointer-events-none absolute inset-0">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className={cn('clay-orb absolute', orb.className)}
          style={
            {
              '--orb': orb.tone,
              '--orb-deep': orb.deep,
              animationDelay: orb.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
