'use client';

import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

export const QUICK_PROMPT_KEYS = [
  'guideUi.promptGetStarted',
  'guideUi.promptAiGenerate',
  'guideUi.promptStudyModes',
  'guideUi.promptCreateSet',
  'guideUi.promptAiBackground',
  'guideUi.promptImport',
  'guideUi.promptSplitMerge',
  'guideUi.promptShare',
  'guideUi.promptStreak',
  'guideUi.promptReminder',
  'guideUi.promptOffline',
  'guideUi.promptAppearance',
  'guideUi.promptVerifyEmail',
] as const;

/** Questions shown before the "…" toggle reveals the rest. */
export const VISIBLE_PROMPT_COUNT = 3;

export function GuideQuickPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  const t = useTranslations();
  const [expanded, setExpanded] = useState(false);
  const keys = expanded ? QUICK_PROMPT_KEYS : QUICK_PROMPT_KEYS.slice(0, VISIBLE_PROMPT_COUNT);

  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((key) => {
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto text-xs text-muted-foreground"
        aria-expanded={expanded}
        aria-label={expanded ? t('guideUi.fewerPrompts') : t('guideUi.morePrompts')}
        title={expanded ? t('guideUi.fewerPrompts') : t('guideUi.morePrompts')}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? t('guideUi.fewerPrompts') : <MoreHorizontal className="h-4 w-4" />}
      </Button>
    </div>
  );
}
