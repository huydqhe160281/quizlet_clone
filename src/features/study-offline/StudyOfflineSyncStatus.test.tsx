/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StudyOfflineSyncStatus } from '@/features/study-offline/StudyOfflineSyncStatus';

const syncNow = vi.fn(async () => undefined);

vi.mock('@/features/study-offline/StudyOfflineSyncProvider', () => ({
  useStudyOfflineSync: () => ({
    counts: {
      pending: 2,
      failed: 1,
      failedSessionComplete: false,
    },
    lastSyncedAt: null,
    syncNow,
    dismissFailed: async () => undefined,
    refreshCounts: async () => undefined,
  }),
}));

vi.mock('@/lib/i18n/LocaleProvider', () => ({
  useTranslations: () => (key: string, vars?: Record<string, string | number>) => {
    if (key === 'pwa.syncPending') return `${vars?.count ?? 0} pending`;
    if (key === 'pwa.syncFailed') return `${vars?.count ?? 0} failed`;
    if (key === 'pwa.syncNow') return 'Sync now';
    if (key === 'pwa.syncSynced') return '✓ Synced';
    if (key === 'pwa.syncFailedSessionComplete') return 'session-complete failed';
    return key;
  },
}));

describe('StudyOfflineSyncStatus', () => {
  afterEach(() => {
    cleanup();
    syncNow.mockClear();
  });

  it('Scenario: Pending count is visible', () => {
    render(<StudyOfflineSyncStatus />);
    expect(screen.getByTestId('sync-status-badge')).toHaveTextContent('2 pending');
    expect(screen.getByTestId('sync-status-badge')).toHaveTextContent('1 failed');
  });

  it('Scenario: Manual sync trigger', () => {
    render(<StudyOfflineSyncStatus />);
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(syncNow).toHaveBeenCalled();
  });
});
