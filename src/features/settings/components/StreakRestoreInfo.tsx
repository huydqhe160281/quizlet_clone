'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { RestoreHearts } from '@/components/streak/RestoreHearts';
import { Button } from '@/components/ui/button';
import {
  fetchStreakRestoreStatus,
  openStreakRestorePrompt,
  STREAK_UPDATED_EVENT,
  type StreakRestoreStatus,
} from '@/lib/streak/streak-client';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

/** Streak restore balance, progress toward the next one, and a way back to an open offer. */
export function StreakRestoreInfo() {
  const t = useTranslations();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [status, setStatus] = useState<StreakRestoreStatus | null>(null);

  const load = useCallback((isActive: () => boolean) => {
    void fetchStreakRestoreStatus()
      .then((data) => isActive() && setStatus(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const isActive = () => active;
    load(isActive);
    // A restore from the prompt changes the balance and clears the offer.
    const refresh = () => load(isActive);
    window.addEventListener(STREAK_UPDATED_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(STREAK_UPDATED_EVENT, refresh);
    };
  }, [load]);

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
      {status.offer && userId && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('settingsPage.study.restoreAvailable', { streak: status.offer.streak })}
          </p>
          <Button size="sm" onClick={() => openStreakRestorePrompt(userId)}>
            {t('settingsPage.study.restoreAction')}
          </Button>
        </div>
      )}
    </div>
  );
}
