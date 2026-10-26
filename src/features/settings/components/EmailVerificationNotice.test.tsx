/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/render-with-locale';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { EmailVerificationNotice } from '@/features/settings/components/EmailVerificationNotice';

describe('EmailVerificationNotice', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    refresh.mockClear();
  });

  it('resends the link and confirms where it went', async () => {
    const fetchMock = vi.fn(async () => Response.json({ data: { sent: true } }));
    vi.stubGlobal('fetch', fetchMock);
    renderWithLocale(<EmailVerificationNotice email="ann@example.com" />, { locale: 'en' });

    fireEvent.click(screen.getByRole('button', { name: 'Resend confirmation email' }));

    expect(await screen.findByText(/A new link was sent to ann@example.com/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/verify-email/resend', { method: 'POST' });
    expect(screen.getByRole('button', { name: 'Sent' })).toBeDisabled();
  });

  it('shows the rate-limit message and lets the user retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'RATE_LIMITED' }, { status: 429 }))
    );
    renderWithLocale(<EmailVerificationNotice email="ann@example.com" />, { locale: 'en' });

    fireEvent.click(screen.getByRole('button', { name: 'Resend confirmation email' }));

    expect(await screen.findByText(/Too many requests/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend confirmation email' })).toBeEnabled();
  });

  it('refreshes the page when the address was verified elsewhere', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ data: { alreadyVerified: true } }))
    );
    renderWithLocale(<EmailVerificationNotice email="ann@example.com" />, { locale: 'en' });

    fireEvent.click(screen.getByRole('button', { name: 'Resend confirmation email' }));

    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
