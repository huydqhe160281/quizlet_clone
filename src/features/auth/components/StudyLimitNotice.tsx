'use client';

import Link from 'next/link';
import { MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResendVerification } from '@/features/auth/hooks/useResendVerification';
import { UNVERIFIED_STUDY_LIMIT } from '@/features/study/lib/study-limit';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

/**
 * Shown when an unverified account has used its review budget and must verify to go on.
 * `backHref` adds a way out where the notice replaces the whole study screen.
 */
export function StudyLimitNotice({ backHref }: { backHref?: string }) {
  const t = useTranslations();
  const { state, resend } = useResendVerification();

  return (
    <div
      role="alert"
      className="mx-auto max-w-xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center"
    >
      <MailWarning className="mx-auto h-6 w-6 text-amber-600" aria-hidden />
      <p className="mt-2 font-semibold">{t('auth.studyLimitTitle')}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('auth.studyLimitText', { limit: UNVERIFIED_STUDY_LIMIT })}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={resend} disabled={state.status === 'sending' || state.status === 'sent'}>
          {state.status === 'sent' ? t('auth.verifyBannerSent') : t('auth.verifyBannerResend')}
        </Button>
        {backHref && (
          <Button variant="outline" asChild>
            <Link href={backHref}>{t('study.backToSet')}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
