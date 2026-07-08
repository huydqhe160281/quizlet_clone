'use client';

import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { useState } from 'react';
import { CardMediaImage } from '@/components/shared/CardMediaImage';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FlashcardViewerProps = {
  front: string;
  back: string;
  example?: string | null;
  imageUrl?: string | null;
  isFlipped: boolean;
  onFlip: () => void;
  speechEnabled?: boolean;
  onSpeakFront?: () => void;
  onSpeakBack?: () => void;
};

export function FlashcardViewer({
  front,
  back,
  example,
  imageUrl,
  isFlipped,
  onFlip,
  speechEnabled = true,
  onSpeakFront,
  onSpeakBack,
}: FlashcardViewerProps) {
  return (
    <button
      type="button"
      onClick={onFlip}
      className="perspective-1000 mx-auto block w-full max-w-2xl focus:outline-none"
      aria-label={isFlipped ? 'Hiện mặt trước' : 'Hiện mặt sau'}
    >
      <motion.div
        className="relative h-72 w-full transform-style-3d cursor-pointer md:h-80"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, duration: 0.35 }}
      >
        <div
          className={cn(
            'absolute inset-0 flex flex-col justify-between rounded-3xl border border-border/50 bg-card/90 p-6 shadow-lg backface-hidden backdrop-blur-sm'
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Thuật ngữ</span>
            {speechEnabled && onSpeakFront && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-primary"
                onClick={(event) => {
                  event.stopPropagation();
                  onSpeakFront();
                }}
                aria-label="Phát âm thuật ngữ"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <p className="text-3xl font-extrabold tracking-tight md:text-4xl">{front}</p>
            {!isFlipped && imageUrl && <CardMediaImage src={imageUrl} alt={front} />}
          </div>

          <p className="text-[11px] font-semibold text-muted-foreground">
            Bấm thẻ hoặc nhấn Phím Cách để lật
          </p>
        </div>

        <div
          className={cn(
            'absolute inset-0 flex flex-col justify-between rounded-3xl border border-primary/20 bg-primary p-6 text-primary-foreground shadow-lg backface-hidden rotate-y-180'
          )}
        >
          <div className="flex items-center justify-between text-primary-foreground/70">
            <span className="text-[10px] font-bold uppercase tracking-wider">Định nghĩa</span>
            {speechEnabled && onSpeakBack && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  onSpeakBack();
                }}
                aria-label="Phát âm định nghĩa"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <p className="text-xl font-medium leading-relaxed md:text-2xl">{back}</p>
            {example && (
              <p className="mt-4 text-sm font-medium text-primary-foreground/80">{example}</p>
            )}
          </div>

          <p className="text-[11px] font-semibold text-primary-foreground/70">Mặt định nghĩa</p>
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

export function speakStudyText(text: string, lang = 'vi-VN') {
  if (!('speechSynthesis' in window) || !text.trim()) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}
