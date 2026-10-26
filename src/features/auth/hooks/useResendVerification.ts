'use client';

import { useState } from 'react';
import { readErrorPayload } from '@/lib/i18n/api-error-message';

export type ResendVerificationState =
  | { status: 'idle' | 'sending' | 'sent' | 'alreadyVerified' }
  | { status: 'error'; payload: { error?: unknown; message?: unknown } | null };

/** Asks the server to email a fresh verification link to the signed-in user. */
export function useResendVerification() {
  const [state, setState] = useState<ResendVerificationState>({ status: 'idle' });

  const resend = async () => {
    setState({ status: 'sending' });
    try {
      const response = await fetch('/api/v1/auth/verify-email/resend', { method: 'POST' });
      if (!response.ok) {
        setState({ status: 'error', payload: await readErrorPayload(response) });
        return;
      }
      const body = (await response.json().catch(() => null)) as {
        data?: { alreadyVerified?: boolean };
      } | null;
      setState({ status: body?.data?.alreadyVerified ? 'alreadyVerified' : 'sent' });
    } catch {
      setState({ status: 'error', payload: null });
    }
  };

  return { state, resend };
}
