'use client';

import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useStudyPreferences } from '@/features/study/stores/study-preferences';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

/** Device-local toggle for the correct-answer chime used across study modes. */
export function StudySoundToggle() {
  const t = useTranslations();
  const soundEnabled = useStudyPreferences((state) => state.soundEnabled);
  const setSoundEnabled = useStudyPreferences((state) => state.setSoundEnabled);
  // The persisted value lives in localStorage; render the default on the server
  // and the first client pass so hydration matches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="study-sound-enabled"
        className="mt-0.5"
        checked={mounted ? soundEnabled : true}
        disabled={!mounted}
        onCheckedChange={(checked) => setSoundEnabled(checked === true)}
      />
      <div className="space-y-0.5">
        <Label htmlFor="study-sound-enabled" className="cursor-pointer font-semibold">
          {t('settingsPage.study.soundLabel')}
        </Label>
        <p className="text-sm text-muted-foreground">{t('settingsPage.study.soundHint')}</p>
      </div>
    </div>
  );
}
