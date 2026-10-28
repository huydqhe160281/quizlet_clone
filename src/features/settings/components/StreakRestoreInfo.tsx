'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
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
    <div className="flex items-start gap-3">
      <Flame className="mt-0.5 h-4 w-4 shrink-0 fill-orange-500 text-orange-500" aria-hidden />
      <div className="space-y-0.5">
        <p className="font-semibold text-sm">
          {t('settingsPage.study.restoresLabel', {
            balance: status.balance,
            max: status.maxBalance,
          })}
        </p>
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
    </div>
  );
}
