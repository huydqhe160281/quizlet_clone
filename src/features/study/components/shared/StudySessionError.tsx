'use client';

import { RedirectingNotice } from '@/components/shared/RedirectingNotice';

type StudySessionErrorProps = {
  setId: string;
  error: unknown;
};

export function StudySessionError({ setId, error }: StudySessionErrorProps) {
  return (
    <RedirectingNotice
      error={error}
      fallbackHref={`/sets/${setId}`}
      message="Không thể tải phiên học. Đang quay lại…"
    />
  );
}
