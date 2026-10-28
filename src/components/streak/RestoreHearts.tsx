'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

const HEART_PATH =
  'M12 21.35 10.55 20.03C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.54L12 21.35Z';
// Zig-zag crack from the top notch to the bottom tip; the two clip polygons share it.
const CRACK = '12,5 10.4,9 13.2,12.2 10.9,15.4 12.6,18.2 12,22';
const LEFT_HALF = `0,0 12,0 ${CRACK} 12,24 0,24`;
const RIGHT_HALF = `24,0 12,0 ${CRACK} 12,24 24,24`;

type HeartProps = { broken: boolean; pending?: boolean; size: number };

/**
 * One heart drawn as two halves split along a crack. Whole: the halves meet under an intact
 * heart. Broken: the intact heart fades out and the halves tilt apart, turning grey.
 */
function Heart({ broken, pending, size }: HeartProps) {
  const id = useId().replace(/:/g, '');
  const half = 'transition-[transform,fill] duration-500 ease-out motion-reduce:transition-none';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('overflow-visible', pending && !broken && 'animate-heart-pending')}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <clipPath id={`${id}-l`}>
          <polygon points={LEFT_HALF} />
        </clipPath>
        <clipPath id={`${id}-r`}>
          <polygon points={RIGHT_HALF} />
        </clipPath>
      </defs>

      {[
        { clip: `${id}-l`, apart: 'translate(-0.9px, 0.6px) rotate(-8deg)' },
        { clip: `${id}-r`, apart: 'translate(0.9px, 0.6px) rotate(8deg)' },
      ].map(({ clip, apart }) => (
        <g
          key={clip}
          clipPath={`url(#${clip})`}
          className={half}
          style={{
            transform: broken ? apart : 'none',
            transformBox: 'view-box',
            transformOrigin: '12px 21px',
          }}
        >
          <path
            d={HEART_PATH}
            className={cn(
              half,
              broken
                ? 'fill-muted-foreground/30 stroke-muted-foreground/70 dark:fill-muted-foreground/45'
                : 'stroke-transparent'
            )}
            fill={broken ? undefined : `url(#${id}-fill)`}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        </g>
      ))}

      {/* Intact heart on top hides the seam between the halves while whole. */}
      <g
        className="transition-opacity duration-200 motion-reduce:transition-none"
        style={{ opacity: broken ? 0 : 1 }}
      >
        <path d={HEART_PATH} fill={`url(#${id}-fill)`} />
        <ellipse
          cx="7.6"
          cy="7.4"
          rx="2.4"
          ry="1.5"
          fill="#fff"
          opacity="0.45"
          transform="rotate(-30 7.6 7.4)"
        />
      </g>
    </svg>
  );
}

type RestoreHeartsProps = {
  balance: number;
  max: number;
  /** Highlight this many of the rightmost whole hearts (the ones a restore would spend). */
  pending?: number;
  size?: number;
  label: string;
  className?: string;
};

/** Streak restores as hearts: whole hearts first, then cracked ones for what has been spent. */
export function RestoreHearts({
  balance,
  max,
  pending = 0,
  size = 22,
  label,
  className,
}: RestoreHeartsProps) {
  const whole = Math.max(0, Math.min(balance, max));
  return (
    <div role="img" aria-label={label} className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: max }, (_, index) => (
        <Heart
          key={index}
          size={size}
          broken={index >= whole}
          pending={index < whole && index >= whole - pending}
        />
      ))}
    </div>
  );
}
