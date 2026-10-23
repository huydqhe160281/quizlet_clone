'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { MailWarning, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccountStatus } from '@/features/auth/hooks/useAccountStatus';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

const DISMISS_KEY = 'email-verification-banner-dismissed';

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/** Also mounts the account-status check that signs out revoked sessions. */
export function EmailVerificationBanner() {
  const t = useTranslations();
  const { data: session } = useSession();
  const { data: account } = useAccountStatus(session?.user?.id);
  const [dismissed, setDismissed] = useState(() =>
    typeof window === 'undefined' ? false : readDismissed()
  );
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (!account?.needsEmailVerification || dismissed) return null;

  const resend = async () => {
    setState('sending');
    try {
      const response = await fetch('/api/v1/auth/verify-email/resend', { method: 'POST' });
      setState(response.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  };

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Storage may be unavailable (private mode); hiding until reload is enough.
    }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs leading-snug sm:gap-3 sm:px-4 sm:py-2 sm:text-sm"
    >
      <MailWarning className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <span className="min-w-0 flex-1">{t('auth.verifyBannerText')}</span>
      <Button
        size="sm"
        variant="outline"
        className="h-8 shrink-0 px-3 text-xs sm:h-9 sm:text-sm"
        onClick={resend}
        disabled={state === 'sending' || state === 'sent'}
      >
        {state === 'sent' ? t('auth.verifyBannerSent') : t('auth.verifyBannerResend')}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 sm:h-11 sm:w-11"
        onClick={dismiss}
        aria-label={t('auth.verifyBannerDismiss')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
