'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

export function DueCardsAlert({ dueCount }: { dueCount: number }) {
  const t = useTranslations();

  // Spec: when dueToday = 0, due alert is not shown.
  if (dueCount === 0) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden rounded-xl border-primary/30 bg-primary/5 shadow-md backdrop-blur-sm">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="relative z-10 flex flex-row items-center gap-4 space-y-0 pb-3">
        <div className="rounded-full bg-primary/20 p-2 text-primary">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <CardTitle className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-lg text-transparent">
            {t('dashboardPage.cardsDueToday', { count: dueCount })}
          </CardTitle>
          <CardDescription>{t('dashboardPage.keepStreak')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm">
          <Link href="/today">{t('dashboardPage.startReview')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
