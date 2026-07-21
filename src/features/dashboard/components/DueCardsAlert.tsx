'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

export function DueCardsAlert({ dueCount }: { dueCount: number }) {
  const t = useTranslations();

  if (dueCount === 0) {
    return (
      <Card className="relative overflow-hidden rounded-xl border-border/50 bg-muted/20 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-3">
          <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-lg">{t('dashboardPage.allCaughtUp')}</CardTitle>
            <CardDescription>{t('dashboardPage.noCardsDue')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link href="/library">{t('dashboardPage.browseLibrary')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
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
          <Link href="/study">{t('dashboardPage.startReview')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
