'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Flame } from 'lucide-react';
import {
  fetchStreakSnapshot,
  isStreakCacheFresh,
  readStreakCache,
  STREAK_UPDATED_EVENT,
  type StreakSnapshot,
  type StreakUpdatedDetail,
  writeStreakCache,
} from '@/lib/streak/streak-client';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

export function StreakBadge({ className }: { className?: string }) {
  const t = useTranslations();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [streak, setStreak] = useState<StreakSnapshot | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;

    const applyStreak = (data: StreakSnapshot) => {
      if (active) {
        setStreak(data);
      }
    };

    const cached = readStreakCache(userId);
    // Never trust a fresh "0" cache — session create may have bumped streak
    // without a prior event (e.g. Today CTA before notify wired).
    if (isStreakCacheFresh(userId, cached) && cached.currentStreak > 0) {
      applyStreak(cached);
    } else {
      void fetchStreakSnapshot(userId)
        .then(applyStreak)
        .catch(() => {});
    }

    const onStreakUpdated = (event: Event) => {
      const detail = (event as CustomEvent<StreakUpdatedDetail>).detail;
      if (!detail) {
        return;
      }
      writeStreakCache(userId, detail);
      applyStreak(detail);
    };

    window.addEventListener(STREAK_UPDATED_EVENT, onStreakUpdated);

    return () => {
      active = false;
      window.removeEventListener(STREAK_UPDATED_EVENT, onStreakUpdated);
    };
  }, [userId]);

  if (!streak || streak.currentStreak <= 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 h-8 sm:h-9 text-sm font-bold text-orange-600 shadow-sm dark:text-orange-400',
        className
      )}
      title={t('dashboardPage.streakTitle', { record: streak.longestStreak })}
    >
      <Flame className="h-4 w-4 fill-orange-500 text-orange-500" aria-hidden />
      <span>{t('dashboardPage.streakDays', { count: streak.currentStreak })}</span>
    </div>
  );
}
