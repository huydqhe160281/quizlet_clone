import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

type RoundSummaryProps = {
  roundIndex: number;
  correctCount: number;
  total: number;
  mode: string;
  onNextRound: () => void;
};

const MODE_LABELS: Record<string, string> = {
  FLASHCARD: 'Thẻ ghi nhớ',
  LEARN: 'Học & Nhớ',
  WRITE: 'Gõ đáp án',
  TEST: 'Kiểm tra',
  DRAW: 'Viết chữ',
};

export function RoundSummary({
  roundIndex,
  correctCount,
  total,
  mode,
  onNextRound,
}: RoundSummaryProps) {
  const incorrectCount = total - correctCount;
  const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <Card className="glass-panel mx-auto max-w-md overflow-hidden rounded-3xl border-border/50 text-center shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-extrabold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          Hoàn thành vòng {roundIndex + 1}
        </CardTitle>
        <CardDescription>{MODE_LABELS[mode] ?? mode}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mode === 'FLASHCARD' ? (
          <div className="py-4">
            <p className="text-4xl font-extrabold tracking-tight text-foreground">{total}</p>
            <p className="mt-1 text-sm text-muted-foreground">Thẻ đã ôn trong vòng này</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <CheckCircle2 className="mb-1 h-6 w-6 text-emerald-500" />
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {correctCount}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">Đúng</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
              <XCircle className="mb-1 h-6 w-6 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{incorrectCount}</span>
              <span className="mt-1 text-xs text-muted-foreground">Sai</span>
            </div>
          </div>
        )}

        {mode !== 'FLASHCARD' && (
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        )}

        <Button
          onClick={onNextRound}
          className="flex w-full items-center justify-center gap-2 rounded-xl font-bold"
          id="next-round-btn"
        >
          Vòng tiếp theo <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
