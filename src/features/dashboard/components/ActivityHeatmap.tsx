'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type ActivityDay = { date: string; count: number; future?: boolean };

type ActivityHeatmapProps = {
  activity: Array<{ date: string; count: number }>;
};

const WEEKS = 53;

function toUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseUtcDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/** Build a Sunday→Saturday aligned week grid for the last ~year. */
function buildHeatmapDays(activity: Array<{ date: string; count: number }>): ActivityDay[] {
  const byDate = new Map(activity.map((item) => [item.date, item.count]));
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (WEEKS - 1) * 7);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const days: ActivityDay[] = [];
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    const key = toUtcDateKey(cursor);
    days.push({ date: key, count: byDate.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  while (days.length % 7 !== 0) {
    const key = toUtcDateKey(cursor);
    days.push({ date: key, count: 0, future: true });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function getMonthLabels(days: ActivityDay[], weekCount: number, locale: string) {
  const labelsByWeek = new Map<number, string>();
  let lastMonth = -1;

  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7);
    const sample = weekDays.find((day) => !day.future) ?? weekDays[0];
    if (!sample) continue;

    const month = parseUtcDate(sample.date).getUTCMonth();
    if (month === lastMonth) continue;

    lastMonth = month;
    labelsByWeek.set(
      weekIndex,
      parseUtcDate(sample.date).toLocaleString(locale, {
        month: 'short',
        timeZone: 'UTC',
      })
    );
  }

  return labelsByWeek;
}

function cellToneClass(day: ActivityDay, max: number) {
  if (day.future) {
    return 'bg-transparent';
  }
  if (day.count <= 0) {
    return 'bg-muted/70 dark:bg-white/10';
  }
  const intensity = day.count / max;
  if (intensity <= 0.25) return 'bg-primary/35';
  if (intensity <= 0.5) return 'bg-primary/55';
  if (intensity <= 0.75) return 'bg-primary/75';
  return 'bg-primary';
}

export function ActivityHeatmap({ activity }: ActivityHeatmapProps) {
  const t = useTranslations();
  const locale = useLocale();
  const days = useMemo(() => buildHeatmapDays(activity), [activity]);
  const weekCount = days.length / 7;
  const monthLabels = useMemo(
    () => getMonthLabels(days, weekCount, locale),
    [days, weekCount, locale]
  );
  const totalReviews = useMemo(
    () => activity.reduce((sum, item) => sum + item.count, 0),
    [activity]
  );
  const max = Math.max(...days.map((item) => item.count), 1);
  /** GitHub-style: label Mon / Wed / Fri only (Sun→Sat rows). */
  const dayLabels = [
    '',
    t('dashboardPage.dayMon'),
    '',
    t('dashboardPage.dayWed'),
    '',
    t('dashboardPage.dayFri'),
    '',
  ];

  return (
    <div className="glass-panel relative overflow-hidden rounded-xl p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {t('dashboardPage.activityTitle')}
        </h3>
        <p className="text-xs text-muted-foreground">
          {totalReviews > 0
            ? t('dashboardPage.reviewsLastYear', { count: totalReviews })
            : t('dashboardPage.last12Months')}
        </p>
      </div>

      <div className="relative z-10 space-y-1">
        <div className="flex">
          <div className="w-8 shrink-0" aria-hidden />
          <div
            className="grid min-w-0 flex-1"
            style={{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: weekCount }, (_, weekIndex) => (
              <div
                key={`month-${weekIndex}`}
                className="truncate text-[10px] leading-none text-muted-foreground"
              >
                {monthLabels.get(weekIndex) ?? ''}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-stretch gap-1.5">
          <div
            className="grid w-8 shrink-0 gap-[3px] text-[10px] leading-none text-muted-foreground"
            style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
            aria-hidden
          >
            {dayLabels.map((label, index) => (
              <span key={`day-${index}`} className="flex items-center justify-end pr-0.5">
                {label}
              </span>
            ))}
          </div>

          <div
            className="grid min-w-0 flex-1 gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
              gridTemplateRows: 'repeat(7, auto)',
              gridAutoFlow: 'column',
            }}
            role="img"
            aria-label={t('dashboardPage.heatmapAria')}
          >
            {days.map((item) => (
              <div
                key={item.date}
                title={
                  item.future
                    ? undefined
                    : t('dashboardPage.reviewTooltip', {
                        date: item.date,
                        count: item.count,
                      })
                }
                className={cn(
                  'aspect-square w-full rounded-[3px] transition-transform hover:z-10 hover:scale-110',
                  cellToneClass(item, max)
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {totalReviews === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboardPage.noActivity')}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('dashboardPage.activityHint')}</p>
        )}
        <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
          <span>{t('dashboardPage.less')}</span>
          <span className="h-2.5 w-2.5 rounded-sm bg-muted/70 dark:bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/35" />
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/55" />
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/75" />
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
          <span>{t('dashboardPage.more')}</span>
        </div>
      </div>
    </div>
  );
}
