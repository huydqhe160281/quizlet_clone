'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { detectTimeZone, savePreferredTimeZone } from '@/lib/streak/streak-client';

function listTimeZones(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    // Older browsers: offer at least the stored zone and UTC.
  }
  return Array.from(new Set(['UTC', current, ...zones])).sort((a, b) =>
    a === 'UTC' ? -1 : b === 'UTC' ? 1 : a.localeCompare(b)
  );
}

/** Account time zone: decides when a study day (streak) starts and when the reminder fires. */
export function TimeZoneSetting({ initialTimeZone }: { initialTimeZone: string }) {
  const t = useTranslations();
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [saving, setSaving] = useState(false);
  const zones = useMemo(() => listTimeZones(timeZone), [timeZone]);
  // Detected after mount so the server render and hydration match.
  const [deviceZone, setDeviceZone] = useState<string | null>(null);
  useEffect(() => setDeviceZone(detectTimeZone()), []);

  const save = async (next: string) => {
    if (next === timeZone) return;
    const previous = timeZone;
    setTimeZone(next);
    setSaving(true);
    try {
      setTimeZone(await savePreferredTimeZone(next));
      toast.success(t('settingsPage.study.timeZoneSaved', { timeZone: next }));
    } catch {
      setTimeZone(previous);
      toast.error(t('settingsPage.study.timeZoneFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor="study-time-zone" className="font-semibold">
        {t('settingsPage.study.timeZoneLabel')}
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          id="study-time-zone"
          value={timeZone}
          disabled={saving}
          onChange={(event) => void save(event.target.value)}
          className="h-10 min-w-0 max-w-full flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:max-w-xs"
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        {deviceZone && deviceZone !== timeZone && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => void save(deviceZone)}
          >
            {t('settingsPage.study.timeZoneUseDevice', { timeZone: deviceZone })}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t('settingsPage.study.timeZoneHint')}</p>
    </div>
  );
}
