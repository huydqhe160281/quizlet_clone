'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CANVAS_SIZE } from '@/features/study/lib/draw-config';
import {
  maskFromImageData,
  renderReferenceMask,
  scoreFreeDrawMatch,
} from '@/features/study/lib/free-draw-scoring';

type FreeDrawCanvasProps = {
  character: string;
  onComplete: (isCorrect: boolean) => void;
  onSkip: () => void;
};

const strokeStyle = '#0f172a';

export function FreeDrawCanvas({ character, onComplete, onSkip }: FreeDrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const referenceMaskRef = useRef<Uint8Array | null>(null);
  const drawingRef = useRef(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const displayChar = character.trim() || character;

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    return canvas.getContext('2d');
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFeedback(null);
  }, [getContext]);

  useEffect(() => {
    referenceMaskRef.current = renderReferenceMask(displayChar, CANVAS_SIZE);
    clearCanvas();
  }, [displayChar, clearCanvas]);

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = getContext();
    const point = pointerPosition(event);
    if (!ctx || !point) {
      return;
    }
    drawingRef.current = true;
    setFeedback(null);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const continueStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }
    const ctx = getContext();
    const point = pointerPosition(event);
    if (!ctx || !point) {
      return;
    }
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeStyle;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const endStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleDone = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setFeedback('Không thể kiểm tra nét vẽ. Thử tải lại trang.');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setFeedback('Hãy vẽ ký tự trước khi bấm Xong.');
      return;
    }

    const referenceMask = referenceMaskRef.current ?? renderReferenceMask(displayChar, CANVAS_SIZE);
    if (!referenceMask) {
      setFeedback('Hãy vẽ ký tự trước khi bấm Xong.');
      return;
    }

    const userMask = maskFromImageData(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
    const result = scoreFreeDrawMatch(userMask, referenceMask, CANVAS_SIZE, CANVAS_SIZE);

    if (!result.passed) {
      setFeedback(result.reason);
      return;
    }

    onComplete(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative rounded-xl border border-border bg-background shadow-inner">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-8xl text-muted-foreground/25"
        >
          {displayChar}
        </span>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="relative touch-none rounded-xl"
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
      </div>
      {feedback && <p className="text-sm text-destructive">{feedback}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={clearCanvas}>
          Xóa
        </Button>
        <Button size="sm" onClick={handleDone}>
          Xong
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Bỏ qua
        </Button>
      </div>
    </div>
  );
}
