/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithLocale } from '@/test/render-with-locale';

// A plain function, not vi.fn: a rejecting vi.fn result is reported as unhandled even
// when the component catches it.
const save = vi.hoisted(() => ({
  calls: [] as string[],
  impl: async (timeZone: string): Promise<string> => timeZone,
}));
vi.mock('@/lib/streak/streak-client', () => ({
  detectTimeZone: () => 'Asia/Ho_Chi_Minh',
  savePreferredTimeZone: (timeZone: string) => {
    save.calls.push(timeZone);
    return save.impl(timeZone);
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { TimeZoneSetting } from '@/features/settings/components/TimeZoneSetting';

describe('TimeZoneSetting', () => {
  beforeEach(() => {
    save.calls = [];
    save.impl = async (timeZone) => timeZone;
  });
  afterEach(cleanup);

  it('shows the stored zone and saves a newly picked one', async () => {
    renderWithLocale(<TimeZoneSetting initialTimeZone="UTC" />);

    const select = screen.getByLabelText(/time zone|múi giờ/i) as HTMLSelectElement;
    expect(select.value).toBe('UTC');

    fireEvent.change(select, { target: { value: 'Asia/Tokyo' } });
    await waitFor(() => expect(save.calls).toEqual(['Asia/Tokyo']));
    await waitFor(() => expect(select.value).toBe('Asia/Tokyo'));
  });

  it('offers the device zone when it differs, and rolls back on failure', async () => {
    save.impl = async () => {
      throw new Error('nope');
    };
    renderWithLocale(<TimeZoneSetting initialTimeZone="Asia/Tokyo" />);

    fireEvent.click(await screen.findByRole('button', { name: /Asia\/Ho_Chi_Minh/ }));
    await waitFor(() => expect(save.calls).toEqual(['Asia/Ho_Chi_Minh']));
    const select = screen.getByLabelText(/time zone|múi giờ/i) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('Asia/Tokyo'));
  });
});
