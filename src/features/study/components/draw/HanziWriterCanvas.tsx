'use client';

import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { Button } from '@/components/ui/button';
import { CANVAS_PADDING, CANVAS_SIZE, MAX_MISTAKES } from '@/features/study/lib/draw-config';
import { isHanziWriterHanChar } from '@/features/study/lib/cjk-draw-utils';
import { FreeDrawCanvas } from '@/features/study/components/draw/FreeDrawCanvas';

type HanziWriterCanvasProps = {
  character: string;
  back: string;
  onComplete: (isCorrect: boolean) => void;
  onSkip: () => void;
};

export function HanziWriterCanvas({ character, onComplete, onSkip }: HanziWriterCanvasProps) {
  const drawableChar = character.trim();

  if (!isHanziWriterHanChar(drawableChar)) {
    return <FreeDrawCanvas character={character} onComplete={onComplete} onSkip={onSkip} />;
  }

  return <HanziWriterQuizCanvas character={drawableChar} onComplete={onComplete} onSkip={onSkip} />;
}

type HanziWriterQuizCanvasProps = {
  character: string;
  onComplete: (isCorrect: boolean) => void;
  onSkip: () => void;
};

function HanziWriterQuizCanvas({ character, onComplete, onSkip }: HanziWriterQuizCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const mistakesRef = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [mountKey, setMountKey] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setLoadError(false);
    setMountKey((key) => key + 1);
  }, [character]);

  useEffect(() => {
    if (!containerRef.current || loadError) {
      return undefined;
    }

    mistakesRef.current = 0;
    writerRef.current = HanziWriter.create(containerRef.current, character, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      padding: CANVAS_PADDING,
      showOutline: true,
      showHintAfterMisses: MAX_MISTAKES,
      onLoadCharDataError: () => setLoadError(true),
    });
    writerRef.current.quiz({
      onMistake: () => {
        mistakesRef.current += 1;
      },
      onComplete: () => onCompleteRef.current(mistakesRef.current <= MAX_MISTAKES),
    });

    return () => {
      writerRef.current?.cancelQuiz();
    };
  }, [character, loadError, mountKey]);

  const restartQuiz = () => {
    mistakesRef.current = 0;
    writerRef.current?.cancelQuiz();
    writerRef.current?.quiz({
      onMistake: () => {
        mistakesRef.current += 1;
      },
      onComplete: () => onCompleteRef.current(mistakesRef.current <= MAX_MISTAKES),
    });
  };

  if (loadError) {
    return (
      <div className="space-y-4 rounded-xl border border-dashed border-border p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Không tải được dữ liệu nét vẽ. Kiểm tra kết nối mạng rồi thử lại.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => setLoadError(false)}>
            Thử lại
          </Button>
          <Button variant="secondary" onClick={onSkip}>
            Bỏ qua thẻ này
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="rounded-xl border border-border bg-background shadow-inner"
      />
      <Button variant="outline" size="sm" onClick={restartQuiz}>
        Xóa
      </Button>
    </div>
  );
}
