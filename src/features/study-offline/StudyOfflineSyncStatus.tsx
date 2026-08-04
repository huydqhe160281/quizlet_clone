'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { useStudyOfflineSync } from '@/features/study-offline/StudyOfflineSyncProvider';
import { Button } from '@/components/ui/button';

/** Compact sync-status badge for study surfaces. */
export function StudyOfflineSyncStatus() {
  const t = useTranslations();
  const { counts, lastSyncedAt, syncNow, dismissFailed } = useStudyOfflineSync();
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (!lastSyncedAt) return;
    setShowSynced(true);
    const timer = setTimeout(() => setShowSynced(false), 2500);
    return () => clearTimeout(timer);
  }, [lastSyncedAt]);

  if (counts.failedSessionComplete) {
    return (
      <div
        role="status"
        data-testid="sync-failed-session-complete"
        className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        <p className="font-medium">{t('pwa.syncFailedSessionComplete')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {counts.pending > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void syncNow();
              }}
            >
              {t('pwa.syncNow')}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void dismissFailed();
            }}
          >
            {t('pwa.syncDismissFailed')}
          </Button>
        </div>
      </div>
    );
  }

  if (counts.pending === 0 && counts.failed === 0) {
    if (!showSynced) return null;
    return (
      <p role="status" data-testid="sync-synced" className="text-xs text-muted-foreground">
        {t('pwa.syncSynced')}
      </p>
    );
  }

  return (
    <div
      role="status"
      data-testid="sync-status-badge"
      className="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <span>
        {t('pwa.syncPending', { count: counts.pending })}
        {counts.failed > 0 ? ` · ${t('pwa.syncFailed', { count: counts.failed })}` : ''}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={() => {
          void syncNow();
        }}
      >
        {t('pwa.syncNow')}
      </Button>
    </div>
  );
}
