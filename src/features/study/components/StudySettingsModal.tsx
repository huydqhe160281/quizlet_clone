'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { StudyModeValue } from '@/features/study/schemas/study.schema';
import { StudySettingsForm } from '@/features/study/components/StudySettingsForm';

type StudySettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  totalCards: number;
  newWordCount: number;
  initialMode?: StudyModeValue;
};

export function StudySettingsModal({
  open,
  onOpenChange,
  setId,
  totalCards,
  newWordCount,
  initialMode,
}: StudySettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tùy chỉnh phiên học</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Chọn chế độ và cấu hình vòng luyện tập — {totalCards} thẻ sẵn sàng.
          </p>
        </DialogHeader>
        {open ? (
          <StudySettingsForm
            setId={setId}
            totalCards={totalCards}
            newWordCount={newWordCount}
            variant="modal"
            initialMode={initialMode}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
