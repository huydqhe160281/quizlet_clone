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
            'absolute inset-0 flex flex-col items-center justify-center rounded-xl border bg-card p-6 shadow-md backface-hidden'
          )}
        >
          <p className="text-sm text-muted-foreground">Front</p>
          <p className="mt-2 text-center text-xl font-medium">{front}</p>
          {!isFlipped && imageUrl && <CardMediaImage src={imageUrl} alt={front} />}
        </div>
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center rounded-xl border bg-primary/5 p-6 shadow-md backface-hidden rotate-y-180'
          )}
        >
          <p className="text-sm text-muted-foreground">Back</p>
          <p className="mt-2 text-center text-xl font-medium">{back}</p>
          {example && <p className="mt-2 text-center text-sm text-muted-foreground">{example}</p>}
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
