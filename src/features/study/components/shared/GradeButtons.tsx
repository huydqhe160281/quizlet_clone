'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type GradeButtonsProps = {
  onAgain: () => void;
  onHard: () => void;
  onGood: () => void;
  onEasy: () => void;
  disabled?: boolean;
};

export function GradeButtons({
  onAgain,
  onHard,
  onGood,
  onEasy,
  disabled = false,
}: GradeButtonsProps) {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Button variant="destructive" onClick={onAgain} disabled={disabled}>
        {t('studyUi.gradeAgain')}
      </Button>
      <Button variant="outline" onClick={onHard} disabled={disabled}>
        {t('studyUi.gradeHard')}
      </Button>
      <Button variant="secondary" onClick={onGood} disabled={disabled}>
        {t('studyUi.gradeGood')}
      </Button>
      <Button onClick={onEasy} disabled={disabled}>
        {t('studyUi.gradeEasy')}
      </Button>
    </div>
  );
}
