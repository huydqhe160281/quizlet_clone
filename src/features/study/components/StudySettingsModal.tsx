'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { StudyModeValue } from '@/features/study/schemas/study.schema';
import { StudySettingsForm } from '@/features/study/components/StudySettingsForm';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type StudySettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  totalCards: number;
  newWordCount: number;
  initialMode?: StudyModeValue;
  hideModeSelect?: boolean;
};

export function StudySettingsModal({
  open,
  onOpenChange,
  setId,
  totalCards,
  newWordCount,
  initialMode,
  hideModeSelect = false,
}: StudySettingsModalProps) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('study.settings.title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {hideModeSelect
              ? t('studyUi.settingsSubtitleLocked', { count: totalCards })
              : t('study.settings.subtitle', { count: totalCards })}
          </p>
        </DialogHeader>
        {open ? (
          <StudySettingsForm
            setId={setId}
            totalCards={totalCards}
            newWordCount={newWordCount}
            variant="modal"
            initialMode={initialMode}
            hideModeSelect={hideModeSelect}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
