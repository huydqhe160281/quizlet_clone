'use client';

import { useNavigateBackOnError } from '@/hooks/use-navigate-back-on-error';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type RedirectingNoticeProps = {
  error: unknown;
  fallbackHref: string;
  message?: string;
};

export function RedirectingNotice({ error, fallbackHref, message }: RedirectingNoticeProps) {
  const t = useTranslations();
  useNavigateBackOnError(error, fallbackHref);

  if (!error) {
    return null;
  }

  return (
    <div className="glass-panel mx-auto max-w-xl rounded-2xl p-8 text-center text-sm text-muted-foreground">
      {message ?? t('ui.errorBoundary.redirecting')}
    </div>
  );
}
