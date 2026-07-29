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
import { useQueryClient } from '@tanstack/react-query';
import { createStudySessionOnce } from '@/features/study/lib/create-session-once';
import { useTodayPlan, useUpdateStudyGoals } from '@/features/today/hooks/useTodayPlan';
import { todayKeys } from '@/features/today/query-keys';
import type { QueueReason, Recommendation } from '@/features/today/types';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { useNavReselectRefetch } from '@/lib/navigation/use-nav-reselect-refetch';
import { notifyStreakUpdated } from '@/lib/streak/streak-client';
import {
  GOAL_MAX,
  GOAL_MIN,
  GOAL_DEFAULT,
  DEFAULT_PREFERRED_TIMEZONE,
  PREFERRED_TIMEZONE_OPTIONS,
} from '@/features/today/constants';

function reasonLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  reason: QueueReason
): string {
  if (reason === 'due') return t('todayPage.reasonDue');
  if (reason === 'weak') return t('todayPage.reasonWeak');
  return t('todayPage.reasonNew');
}

function ctaLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  rec: Recommendation
): string {
  if (rec.kind === 'spaced') return t('todayPage.startSpaced');
  if (rec.kind === 'set-session') {
    const count = rec.cardIds?.length ?? 0;
    if (count > 0) return t('todayPage.startSetSessionFocus', { count });
    return t('todayPage.startSetSession');
  }
  return t('todayPage.startEmpty');
}

export function TodayPageClient() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useTodayPlan();
  const updateGoals = useUpdateStudyGoals();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(GOAL_DEFAULT);
  const [timezoneDraft, setTimezoneDraft] = useState(DEFAULT_PREFERRED_TIMEZONE);
  const [timezoneTouched, setTimezoneTouched] = useState(false);
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
      const cardIds = rec.cardIds;
      if (!cardIds || cardIds.length === 0) {
        setStartError(t('todayPage.loadFailed'));
        return;
      }
      setStarting(true);
      try {
        const result = await createStudySessionOnce(rec.setId, 'LEARN', undefined, cardIds);
        if (result.streak) {
          notifyStreakUpdated(result.streak);
        }
        // Streak / goal progress may have changed on session create — refresh Today on return.
        void queryClient.invalidateQueries({ queryKey: todayKeys.plan() });
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
            <p className="mt-1 text-xs text-muted-foreground">
              {t('todayPage.timezoneLabel')}: {goal.preferredTimezone}
            </p>
            <p className="text-xs text-muted-foreground">{t('todayPage.streakUtcNote')}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setGoalDraft(goal.target);
              const storedTz = goal.preferredTimezone || DEFAULT_PREFERRED_TIMEZONE;
              setTimezoneDraft(
                (PREFERRED_TIMEZONE_OPTIONS as readonly string[]).includes(storedTz)
                  ? storedTz
                  : DEFAULT_PREFERRED_TIMEZONE
              );
              setTimezoneTouched(false);
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
              // Only PATCH timezone when the select was changed — avoids clobbering a
              // valid non-curated IANA zone that fell back to UTC for display.
              const patch: { dailyGoalCards: number; preferredTimezone?: string } = {
                dailyGoalCards: goalDraft,
              };
              if (timezoneTouched) {
                patch.preferredTimezone = timezoneDraft;
              }
              void updateGoals.mutateAsync(patch).then(() => setEditingGoal(false));
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
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">{t('todayPage.timezoneLabel')}</span>
              <select
                className="flex h-9 w-full min-w-[12rem] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={timezoneDraft}
                onChange={(e) => {
                  setTimezoneDraft(e.target.value);
                  setTimezoneTouched(true);
                }}
                aria-label={t('todayPage.timezoneLabel')}
              >
                {PREFERRED_TIMEZONE_OPTIONS.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm" disabled={updateGoals.isPending}>
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
