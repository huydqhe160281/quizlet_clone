/** @vitest-environment jsdom */
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RecentSessions } from '@/features/dashboard/components/RecentSessions';
import { renderWithLocale } from '@/test/render-with-locale';

const session = {
  id: 's1',
  mode: 'LEARN',
  score: 1,
  totalCards: 4,
  correctCount: 4,
  // 23:30 UTC on Jan 1 is already Jan 2 in Asia/Ho_Chi_Minh (UTC+7).
  completedAt: '2026-01-01T23:30:00.000Z',
  set: { id: 'set-1', title: 'Vocab' },
};

describe('RecentSessions dates', () => {
  afterEach(() => cleanup());

  it("formats the completion date in the user's preferred zone", () => {
    renderWithLocale(<RecentSessions sessions={[session]} timeZone="Asia/Ho_Chi_Minh" />, {
      locale: 'en',
    });
    expect(screen.getByText(/Jan 2, 2026/)).toBeTruthy();
  });

  it('uses UTC when no zone is known, the same on server and client', () => {
    renderWithLocale(<RecentSessions sessions={[session]} />, { locale: 'en' });
    expect(screen.getByText(/Jan 1, 2026/)).toBeTruthy();
  });
});
