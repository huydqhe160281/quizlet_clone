import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

type RoundSummaryProps = {
  roundIndex: number; // 0-indexed internally, we show roundIndex + 1
  correctCount: number;
  total: number;
  mode: string;
  onNextRound: () => void;
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
    <Card className="mx-auto max-w-md text-center shadow-lg border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          Round {roundIndex + 1} Complete
        </CardTitle>
        <CardDescription>{mode} mode round results</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mode === 'FLASHCARD' ? (
          <div className="py-4">
            <p className="text-3xl font-extrabold tracking-tight text-foreground">{total}</p>
            <p className="text-sm text-muted-foreground mt-1">Cards reviewed this round</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
              <span className="text-2xl font-bold text-emerald-500">{correctCount}</span>
              <span className="text-xs text-muted-foreground mt-1">Correct</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <XCircle className="h-6 w-6 text-destructive mb-1" />
              <span className="text-2xl font-bold text-destructive">{incorrectCount}</span>
              <span className="text-xs text-muted-foreground mt-1">Incorrect</span>
            </div>
          </div>
        )}

        {mode !== 'FLASHCARD' && (
          <div className="w-full bg-accent/50 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        )}

        <Button
          onClick={onNextRound}
          className="w-full flex items-center justify-center gap-2"
          id="next-round-btn"
        >
          Next round <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
