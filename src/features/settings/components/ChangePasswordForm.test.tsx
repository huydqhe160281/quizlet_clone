/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/render-with-locale';

const signOut = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/features/auth/hooks/useSignOut', () => ({ useSignOut: () => signOut }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

import { ChangePasswordForm } from '@/features/settings/components/ChangePasswordForm';

function fill(current: string, next: string, confirm: string) {
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: confirm } });
  fireEvent.submit(screen.getByRole('button', { name: 'Change password' }));
}

describe('ChangePasswordForm', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signOut.mockClear();
  });

  it('stops on a mismatched confirmation without calling the API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderWithLocale(<ChangePasswordForm />, { locale: 'en' });
    fill('old-password', 'new-password', 'other-password');
    expect(screen.getByRole('alert')).toHaveTextContent("The passwords don't match.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the localized error for a wrong current password', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'INVALID_PASSWORD' }, { status: 400 }))
    );
    renderWithLocale(<ChangePasswordForm />, { locale: 'en' });
    fill('wrong-password', 'new-password', 'new-password');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your current password is incorrect.'
    );
    expect(signOut).not.toHaveBeenCalled();
  });

  it('signs out after a successful change', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ data: {} }))
    );
    renderWithLocale(<ChangePasswordForm />, { locale: 'en' });
    fill('old-password', 'new-password', 'new-password');
    await vi.waitFor(() => expect(signOut).toHaveBeenCalledWith('/login'));
  });
});
