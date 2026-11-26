'use client';

import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/PageHeader';
import { StudyOfflineSyncStatus } from '@/features/study-offline/StudyOfflineSyncStatus';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { SkeletonScreen } from '@/components/shared/Skeleton';
import { SpacedRepetitionFormSkeleton } from '@/features/study/components/shared/StudySkeletons';

function StudyLoadingFallback() {
  const t = useTranslations();
  return (
    <SkeletonScreen label={t('studyUi.spacedLoadingSession')}>
      <SpacedRepetitionFormSkeleton />
    </SkeletonScreen>
  );
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
      <StudyOfflineSyncStatus />
      <SpacedRepetitionStudy />
    </div>
  );
}
