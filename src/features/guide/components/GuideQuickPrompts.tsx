'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

const QUICK_PROMPT_KEYS = [
  'guideUi.promptGetStarted',
  'guideUi.promptCreateSet',
  'guideUi.promptStudyModes',
] as const;

export function GuideQuickPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_PROMPT_KEYS.map((key) => {
        const prompt = t(key);
        return (
          <Button
            key={key}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto whitespace-normal text-left text-xs"
            onClick={() => onSelect(prompt)}
          >
            {prompt}
          </Button>
        );
      })}
    </div>
  );
}
