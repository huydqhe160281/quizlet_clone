/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithLocale } from '@/test/render-with-locale';
import { StreakRestorePrompt } from '@/components/layout/StreakRestorePrompt';
import { StreakRestoreInfo } from '@/features/settings/components/StreakRestoreInfo';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1' } }, status: 'authenticated' }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const status = {
  balance: 5,
  maxBalance: 5,
  reviewsPerRestore: 400,
  reviewsToNext: null,
  offer: { streak: 13, missedDays: 2, cost: 2, affordable: true, studiedToday: false },
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const data = String(url).includes('/streak/restore') ? status : {};
      return new Response(JSON.stringify({ data }), { status: 200 });
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('StreakRestorePrompt', () => {
  it('can be reopened from Settings after being dismissed', async () => {
    renderWithLocale(
      <>
        <StreakRestorePrompt />
        <StreakRestoreInfo />
      </>,
      { locale: 'en' }
    );

    const title = 'Restore your 13-day streak?';
    expect(await screen.findByText(title)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(screen.queryByText(title)).toBeNull());

    fireEvent.click(await screen.findByRole('button', { name: 'Restore streak' }));
    expect(await screen.findByText(title)).toBeTruthy();
  });
});
