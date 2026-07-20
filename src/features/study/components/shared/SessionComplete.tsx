import Link from 'next/link';
import { Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SessionCompleteProps = {
  mode: string;
  correctCount: number;
  total: number;
  reviewedCount?: number;
  setId: string;
};

const MODE_LABELS: Record<string, string> = {
  FLASHCARD: 'Thẻ ghi nhớ',
  LEARN: 'Học & Nhớ',
  WRITE: 'Gõ đáp án',
  TEST: 'Kiểm tra',
  DRAW: 'Viết chữ',
};

export function SessionComplete({
  mode,
  correctCount,
  total,
  reviewedCount,
  setId,
}: SessionCompleteProps) {
  const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <Card className="glass-panel mx-auto max-w-md overflow-hidden rounded-xl border-border/50 text-center shadow-lg">
      <CardHeader className="space-y-3">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Award className="h-10 w-10" />
        </div>
        <CardTitle className="text-2xl font-extrabold">Hoàn thành phiên học!</CardTitle>
        <CardDescription>{MODE_LABELS[mode] ?? mode}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mode === 'FLASHCARD' ? (
          <div>
            <p className="text-4xl font-extrabold tracking-tight">
              {reviewedCount ?? total}/{total}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Thẻ đã ôn tập</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-4xl font-extrabold tracking-tight text-primary">{scorePercent}%</p>
            <p className="text-sm text-muted-foreground">
              {correctCount}/{total} câu trả lời đúng
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="rounded-xl font-bold">
            <Link href={`/sets/${setId}`}>Quay lại học phần</Link>
          </Button>
          <Button variant="outline" asChild className="rounded-xl font-bold">
            <Link href="/sets">Danh sách học phần</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
