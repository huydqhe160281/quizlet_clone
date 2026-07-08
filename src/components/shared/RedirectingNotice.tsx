'use client';

import { useNavigateBackOnError } from '@/hooks/use-navigate-back-on-error';

type RedirectingNoticeProps = {
  error: unknown;
  fallbackHref: string;
  message?: string;
};

export function RedirectingNotice({
  error,
  fallbackHref,
  message = 'Đã xảy ra lỗi. Đang quay lại…',
}: RedirectingNoticeProps) {
  useNavigateBackOnError(error, fallbackHref);

  if (!error) {
    return null;
  }

  return (
    <div className="glass-panel mx-auto max-w-xl rounded-2xl p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
