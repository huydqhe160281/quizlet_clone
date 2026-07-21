'use client';

import { useTranslations } from '@/lib/i18n/LocaleProvider';

type StudyProgressProps = {
  current: number;
  total: number;
  label?: string;
  fullWidth?: boolean;
};

export function StudyProgress({ current, total, label, fullWidth }: StudyProgressProps) {
  const t = useTranslations();
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const resolvedLabel = label ?? t('study.progressDefault');

  return (
    <div className={fullWidth ? 'w-full space-y-2' : 'w-48 space-y-2'}>
      <div className="flex justify-between text-xs font-semibold text-muted-foreground">
        <span>{resolvedLabel}</span>
        <span>{t('study.cardsProgress', { current, total, percent })}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
