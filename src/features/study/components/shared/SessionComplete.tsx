'use client';

import Link from 'next/link';
import { Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { StudyModeValue } from '@/features/study/schemas/study.schema';
import { STUDY_MODE_SHORT_LABEL_KEY } from '@/features/study/lib/study-mode-i18n';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type SessionCompleteProps = {
  mode: string;
  correctCount: number;
  total: number;
  reviewedCount?: number;
  setId: string;
};

export function SessionComplete({
  mode,
  correctCount,
  total,
  reviewedCount,
  setId,
}: SessionCompleteProps) {
  const t = useTranslations();
  const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const modeKey = STUDY_MODE_SHORT_LABEL_KEY[mode as StudyModeValue];

  return (
    <Card className="glass-panel mx-auto max-w-md overflow-hidden rounded-xl border-border/50 text-center shadow-lg">
      <CardHeader className="space-y-3">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Award className="h-10 w-10" />
        </div>
        <CardTitle className="text-2xl font-extrabold">{t('study.sessionComplete')}</CardTitle>
        <CardDescription>{modeKey ? t(modeKey) : mode}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mode === 'FLASHCARD' ? (
          <div>
            <p className="text-4xl font-extrabold tracking-tight">
              {reviewedCount ?? total}/{total}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t('study.reviewedCards')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-4xl font-extrabold tracking-tight text-primary">{scorePercent}%</p>
            <p className="text-sm text-muted-foreground">
              {t('study.correctCount', { correct: correctCount, total })}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="rounded-xl font-bold">
            <Link href={`/sets/${setId}`}>{t('study.backToSet')}</Link>
          </Button>
          <Button variant="outline" asChild className="rounded-xl font-bold">
            <Link href="/sets">{t('study.backToSets')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
