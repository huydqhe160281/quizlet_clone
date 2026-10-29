'use client';

import { RedirectingNotice } from '@/components/shared/RedirectingNotice';
import { StudyLimitNotice } from '@/features/auth/components/StudyLimitNotice';
import { isStudyLimitError } from '@/features/study/lib/study-limit';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type StudySessionErrorProps = {
  setId: string;
  error: unknown;
};

export function StudySessionError({ setId, error }: StudySessionErrorProps) {
  const t = useTranslations();

  if (isStudyLimitError(error)) {
    return <StudyLimitNotice backHref={`/sets/${setId}`} />;
  }

  return (
    <RedirectingNotice
      error={error}
      fallbackHref={`/sets/${setId}`}
      message={t('studyUi.sessionLoadError')}
    />
  );
}
