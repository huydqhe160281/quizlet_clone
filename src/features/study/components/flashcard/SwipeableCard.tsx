'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

/** Horizontal drag distance (px) past which a release counts as a swipe. */
export const SWIPE_OFFSET_THRESHOLD = 100;
/** Fast flicks count as a swipe even when shorter than the offset threshold. */
export const SWIPE_VELOCITY_THRESHOLD = 500;
const FLY_OUT_PX = 600;

export type SwipeDirection = 'left' | 'right';

/** Resolves a drag release into a swipe direction, or `null` to snap back. */
export function resolveSwipe(offsetX: number, velocityX: number): SwipeDirection | null {
  if (offsetX > SWIPE_OFFSET_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD) {
    return 'right';
  }
  if (offsetX < -SWIPE_OFFSET_THRESHOLD || velocityX < -SWIPE_VELOCITY_THRESHOLD) {
    return 'left';
  }
  return null;
}

type SwipeableCardProps = {
  /** Called once the card has flown off-screen. Right = known, left = still learning. */
  onSwipe: (direction: SwipeDirection) => void;
  children: (props: { guardClick: (handler: () => void) => () => void }) => ReactNode;
};

/**
 * Tinder-style horizontal swipe wrapper for the flashcard. Render it with a
 * `key` per card so the drag position resets for the next card.
 */
export function SwipeableCard({ onSwipe, children }: SwipeableCardProps) {
  const t = useTranslations();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const knownOpacity = useTransform(x, [20, SWIPE_OFFSET_THRESHOLD], [0, 1]);
  const learningOpacity = useTransform(x, [-SWIPE_OFFSET_THRESHOLD, -20], [1, 0]);
  const draggedRef = useRef(false);
  const swipedRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Drop the click that a browser fires at the end of a drag (it would flip the card). */
  const guardClick = (handler: () => void) => () => {
    if (!draggedRef.current) {
      handler();
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // The synthetic click (if any) fires right after pointerup; re-arm taps after it.
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
    const direction = resolveSwipe(info.offset.x, info.velocity.x);
    if (!direction || swipedRef.current) {
      void animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      return;
    }
    swipedRef.current = true;
    void animate(x, direction === 'right' ? FLY_OUT_PX : -FLY_OUT_PX, {
      duration: 0.18,
    }).then(() => {
      // A key or button may have answered this card mid fly-out (the card is gone).
      if (mountedRef.current) onSwipe(direction);
    });
  };

  return (
    <motion.div
      data-testid="swipeable-card"
      className="relative touch-pan-y"
      style={{ x, rotate }}
      drag="x"
      dragElastic={0.18}
      dragMomentum={false}
      onDragStart={() => {
        if (swipedRef.current) return;
        draggedRef.current = true;
      }}
      onDragEnd={handleDragEnd}
    >
      <motion.span
        aria-hidden
        style={{ opacity: knownOpacity }}
        className="pointer-events-none absolute left-4 top-4 z-10 inline-flex -rotate-12 items-center gap-1 rounded-lg border-2 border-emerald-500 bg-background/90 px-3 py-1 text-sm font-extrabold uppercase text-emerald-600"
      >
        <Check className="h-4 w-4" />
        {t('studyUi.knowIt')}
      </motion.span>
      <motion.span
        aria-hidden
        style={{ opacity: learningOpacity }}
        className="pointer-events-none absolute right-4 top-4 z-10 inline-flex rotate-12 items-center gap-1 rounded-lg border-2 border-destructive bg-background/90 px-3 py-1 text-sm font-extrabold uppercase text-destructive"
      >
        <X className="h-4 w-4" />
        {t('studyUi.stillLearning')}
      </motion.span>
      {children({ guardClick })}
    </motion.div>
  );
}
