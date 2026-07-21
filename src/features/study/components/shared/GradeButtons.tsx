'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type GradeButtonsProps = {
  onAgain: () => void;
  onHard: () => void;
  onGood: () => void;
  onEasy: () => void;
};

export function GradeButtons({ onAgain, onHard, onGood, onEasy }: GradeButtonsProps) {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Button variant="destructive" onClick={onAgain}>
        {t('studyUi.gradeAgain')}
      </Button>
      <Button variant="outline" onClick={onHard}>
        {t('studyUi.gradeHard')}
      </Button>
      <Button variant="secondary" onClick={onGood}>
        {t('studyUi.gradeGood')}
      </Button>
      <Button onClick={onEasy}>{t('studyUi.gradeEasy')}</Button>
    </div>
  );
}
