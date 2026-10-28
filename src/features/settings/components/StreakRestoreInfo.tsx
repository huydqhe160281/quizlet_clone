'use client';

import { useEffect, useState } from 'react';
import { RestoreHearts } from '@/components/streak/RestoreHearts';
import { fetchStreakRestoreStatus, type StreakRestoreStatus } from '@/lib/streak/streak-client';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

/** Read-only streak restore balance and progress toward the next one. */
export function StreakRestoreInfo() {
  const t = useTranslations();
  const [status, setStatus] = useState<StreakRestoreStatus | null>(null);

  useEffect(() => {
    let active = true;
    void fetchStreakRestoreStatus()
      .then((data) => active && setStatus(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!status) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm font-semibold">{t('settingsPage.study.restoresLabel')}</p>
        <RestoreHearts
          balance={status.balance}
          max={status.maxBalance}
          label={t('streakRestore.heartsAria', {
            balance: status.balance,
            max: status.maxBalance,
          })}
        />
        <span className="text-sm font-semibold tabular-nums text-muted-foreground" aria-hidden>
          {status.balance}/{status.maxBalance}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('settingsPage.study.restoresHint', {
          reviews: status.reviewsPerRestore,
          max: status.maxBalance,
        })}
      </p>
      {status.reviewsToNext !== null && (
        <p className="text-sm text-muted-foreground">
          {t('settingsPage.study.restoresProgress', { count: status.reviewsToNext })}
        </p>
      )}
    </div>
  );
}
