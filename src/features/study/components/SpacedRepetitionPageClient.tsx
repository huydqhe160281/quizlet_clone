'use client';

import dynamic from 'next/dynamic';
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
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {t('studyUi.spacedTitle')}
        </h1>
        <p className="text-muted-foreground">{t('studyUi.spacedSubtitle')}</p>
      </div>
      <SpacedRepetitionStudy />
    </div>
  );
}
