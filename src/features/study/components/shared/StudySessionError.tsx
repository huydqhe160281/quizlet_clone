'use client';

import { RedirectingNotice } from '@/components/shared/RedirectingNotice';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type StudySessionErrorProps = {
  setId: string;
  error: unknown;
};

export function StudySessionError({ setId, error }: StudySessionErrorProps) {
  const t = useTranslations();

  return (
    <RedirectingNotice
      error={error}
      fallbackHref={`/sets/${setId}`}
      message={t('studyUi.sessionLoadError')}
    />
  );
}
