'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { CardMediaImage } from '@/components/shared/CardMediaImage';
import { cn } from '@/lib/utils';

type FlashcardViewerProps = {
  front: string;
  back: string;
  example?: string | null;
  imageUrl?: string | null;
  isFlipped: boolean;
  onFlip: () => void;
};

export function FlashcardViewer({
  front,
  back,
  example,
  imageUrl,
  isFlipped,
  onFlip,
}: FlashcardViewerProps) {
  return (
    <button
      type="button"
      onClick={onFlip}
      className="perspective-1000 mx-auto block w-full max-w-xl focus:outline-none"
      aria-label={isFlipped ? 'Show front' : 'Show back'}
    >
      <motion.div
        className="relative h-64 w-full transform-style-3d cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, duration: 0.35 }}
      >
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 shadow-lg backface-hidden'
          )}
        >
          <p className="absolute top-4 left-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Front
          </p>
          <p className="mt-2 text-center text-3xl font-bold tracking-tight">{front}</p>
          {!isFlipped && imageUrl && <CardMediaImage src={imageUrl} alt={front} />}
        </div>
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-6 shadow-lg backface-hidden rotate-y-180'
          )}
        >
          <p className="absolute top-4 left-4 text-xs font-semibold uppercase tracking-wider text-primary/70">
            Back
          </p>
          <p className="mt-2 text-center text-2xl font-bold tracking-tight text-foreground">
            {back}
          </p>
          {example && (
            <p className="mt-6 text-center text-sm font-medium text-muted-foreground">{example}</p>
          )}
        </div>
      </motion.div>
    </button>
  );
}

export function useFlipState() {
  const [isFlipped, setIsFlipped] = useState(false);
  const flip = () => setIsFlipped((value) => !value);
  const resetFlip = () => setIsFlipped(false);
  return { isFlipped, flip, resetFlip };
}
