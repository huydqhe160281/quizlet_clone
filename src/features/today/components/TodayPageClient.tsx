'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmptyStatePanel } from '@/components/shared/EmptyStatePanel';
import { PageHeader } from '@/components/shared/PageHeader';
import { QueryErrorPanel } from '@/components/shared/QueryErrorPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createStudySessionOnce } from '@/features/study/lib/create-session-once';
import { useTodayPlan, useUpdateStudyGoal } from '@/features/today/hooks/useTodayPlan';
import type { QueueReason, Recommendation } from '@/features/today/types';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { useNavReselectRefetch } from '@/lib/navigation/use-nav-reselect-refetch';
import { GOAL_MAX, GOAL_MIN, GOAL_DEFAULT } from '@/features/today/constants';

function reasonLabel(t: (key: string) => string, reason: QueueReason): string {
  if (reason === 'due') return t('todayPage.reasonDue');
  if (reason === 'weak') return t('todayPage.reasonWeak');
  return t('todayPage.reasonNew');
}

function ctaLabel(t: (key: string) => string, rec: Recommendation): string {
  if (rec.kind === 'spaced') return t('todayPage.startSpaced');
  if (rec.kind === 'set-session') return t('todayPage.startSetSession');
  return t('todayPage.startEmpty');
}

export function TodayPageClient() {
  const t = useTranslations();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useTodayPlan();
  const updateGoal = useUpdateStudyGoal();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(GOAL_DEFAULT);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useNavReselectRefetch('/today', refetch);

  const handleStart = async () => {
    if (!data) return;
    const rec = data.recommendation;
    setStartError(null);

    if (rec.kind === 'empty') {
      router.push(rec.href);
      return;
    }
    if (rec.kind === 'spaced') {
      router.push(rec.href);
      return;
    }
    if (rec.kind === 'set-session' && rec.setId) {
      setStarting(true);
      try {
        const result = await createStudySessionOnce(rec.setId, 'LEARN');
        router.push(`/sets/${rec.setId}/learn?sessionId=${result.data.id}`);
      } catch (err) {
        setStartError(err instanceof Error ? err.message : t('todayPage.loadFailed'));
      } finally {
        setStarting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader title={t('todayPage.title')} subtitle={t('todayPage.subtitle')} />
        <p className="text-sm text-muted-foreground">{t('ui.loading')}</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader title={t('todayPage.title')} subtitle={t('todayPage.subtitle')} />
        <QueryErrorPanel
          message={error instanceof Error ? error.message : t('todayPage.loadFailed')}
          onRetry={refetch}
        />
      </div>
    );
  }

  const { goal, queue, insights, recommendation } = data;
  const accuracyPct = Math.round(insights.accuracyLast7Days * 100);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title={t('todayPage.title')} subtitle={t('todayPage.subtitle')} />

      <section className="space-y-3 rounded-2xl border border-border/50 bg-card/40 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t('todayPage.goalTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('todayPage.goalProgress', { completed: goal.completed, target: goal.target })}
            </p>
            <p className="text-sm text-muted-foreground">
              {goal.remaining === 0
                ? t('todayPage.goalMet')
                : t('todayPage.goalRemaining', { remaining: goal.remaining })}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setGoalDraft(goal.target);
              setEditingGoal((v) => !v);
            }}
          >
            {t('todayPage.editGoal')}
          </Button>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${goal.pct}%` }}
          />
        </div>
        {editingGoal ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void updateGoal.mutateAsync(goalDraft).then(() => setEditingGoal(false));
            }}
          >
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">{t('todayPage.goalLabel')}</span>
              <Input
                type="number"
                min={GOAL_MIN}
                max={GOAL_MAX}
                value={goalDraft}
                onChange={(e) => setGoalDraft(Number(e.target.value))}
                className="w-28"
              />
            </label>
            <Button type="submit" size="sm" disabled={updateGoal.isPending}>
              {t('todayPage.saveGoal')}
            </Button>
          </form>
        ) : null}
      </section>

      <section className="space-y-3">
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          disabled={starting}
          onClick={() => void handleStart()}
        >
          {starting ? t('todayPage.starting') : ctaLabel(t, recommendation)}
        </Button>
        {startError ? <p className="text-sm text-destructive">{startError}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t('todayPage.queueTitle')}</h2>
        {queue.items.length === 0 ? (
          <EmptyStatePanel
            title={t('todayPage.queueEmptyTitle')}
            description={t('todayPage.queueEmptyHint')}
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/sets">{t('todayPage.startEmpty')}</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {queue.items.map((item) => (
              <li
                key={item.cardId}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-card/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.frontPreview ?? item.cardId}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.setTitle}</p>
                </div>
                <Badge variant="secondary">{reasonLabel(t, item.reason)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border/50 bg-muted/20 p-4 sm:p-5">
        <h2 className="text-base font-semibold">{t('todayPage.insightsTitle')}</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>{t('todayPage.reviews7d', { count: insights.reviewsLast7Days })}</li>
          <li>{t('todayPage.accuracy7d', { pct: accuracyPct })}</li>
          <li>{t('todayPage.streak', { count: insights.currentStreak })}</li>
        </ul>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">{t('todayPage.weakSetsTitle')}</p>
          {insights.weakSets.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('todayPage.noWeakSets')}</p>
          ) : (
            <ul className="space-y-1">
              {insights.weakSets.map((set) => (
                <li key={set.setId} className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{set.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {t('todayPage.weakSetCount', { count: set.count })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
