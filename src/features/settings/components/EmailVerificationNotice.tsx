'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResendVerification } from '@/features/auth/hooks/useResendVerification';
import { AI_GENERATE_UNVERIFIED_DAILY_LIMIT } from '@/lib/auth/verification-policy';
import { apiErrorMessage } from '@/lib/i18n/api-error-message';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { UNVERIFIED_STUDY_LIMIT } from '@/features/study/lib/study-limit';

/** Shown under the email row while a password account has not confirmed its address. */
export function EmailVerificationNotice({ email }: { email: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { state, resend } = useResendVerification();

  // Verified in another tab since this page rendered: refresh to show the badge.
  useEffect(() => {
    if (state.status === 'alreadyVerified') router.refresh();
  }, [state.status, router]);

  const sending = state.status === 'sending';
  const sent = state.status === 'sent';

  return (
    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4">
      <div className="flex items-start gap-2.5">
        <MailWarning
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm">
            {t('settingsPage.verify.description', {
              limit: AI_GENERATE_UNVERIFIED_DAILY_LIMIT,
              studyLimit: UNVERIFIED_STUDY_LIMIT,
            })}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-10 w-full sm:h-9 sm:w-auto"
            onClick={() => void resend()}
            disabled={sending || sent}
          >
            {sending
              ? t('settingsPage.verify.sending')
              : sent
                ? t('settingsPage.verify.sent')
                : t('settingsPage.verify.resend')}
          </Button>
          <p role="status" aria-live="polite" className="text-sm">
            {sent && (
              <span className="text-muted-foreground">
                {t('settingsPage.verify.sentHint', { email })}
              </span>
            )}
            {state.status === 'error' && (
              <span className="text-destructive">
                {apiErrorMessage(t, state.payload, 'settingsPage.verify.failed')}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
