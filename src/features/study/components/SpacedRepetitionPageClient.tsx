'use client';

import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/PageHeader';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

function StudyLoadingFallback() {
  const t = useTranslations();
  return <p className="text-sm text-muted-foreground">{t('studyUi.spacedLoadingSession')}</p>;
}

const SpacedRepetitionStudy = dynamic(
  () =>
    import('@/features/study/components/SpacedRepetitionStudy').then(
      (m) => m.SpacedRepetitionStudy
    ),
  {
    ssr: false,
    loading: () => <StudyLoadingFallback />,
  }
);

export function SpacedRepetitionPageClient() {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <PageHeader title={t('studyUi.spacedTitle')} subtitle={t('studyUi.spacedSubtitle')} />
      <SpacedRepetitionStudy />
    </div>
  );
}
