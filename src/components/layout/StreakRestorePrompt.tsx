'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Flame } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  dismissStreakRestore,
  fetchStreakRestoreStatus,
  isStreakRestoreDismissed,
  requestStreakRestore,
  syncDetectedTimeZone,
  type StreakRestoreStatus,
} from '@/lib/streak/streak-client';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

/** Offers to restore a streak broken by 1–3 missed days when the user comes back. */
export function StreakRestorePrompt() {
  const t = useTranslations();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [status, setStatus] = useState<StreakRestoreStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId || isStreakRestoreDismissed(userId)) return;
    let active = true;
    // Missed days depend on the user's time zone, so adopt the browser zone first.
    void syncDetectedTimeZone(userId)
      .catch(() => false)
      .then(() => fetchStreakRestoreStatus())
      .then((data) => {
        if (!active || !data.offer) return;
        setStatus(data);
        setOpen(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);

  const offer = status?.offer;
  if (!userId || !status || !offer) return null;

  const close = () => {
    dismissStreakRestore(userId);
    setOpen(false);
  };

  const restore = async () => {
    setBusy(true);
    try {
      const result = await requestStreakRestore(userId);
      toast.success(t('streakRestore.restored', { streak: result.currentStreak }));
      setOpen(false);
      setStatus(null);
    } catch {
      toast.error(t('streakRestore.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 fill-orange-500 text-orange-500" aria-hidden />
            {t('streakRestore.title', { streak: offer.streak })}
          </DialogTitle>
          <DialogDescription>
            {t('streakRestore.description', {
              missed: offer.missedDays,
              cost: offer.cost,
              balance: status.balance,
              max: status.maxBalance,
            })}
          </DialogDescription>
        </DialogHeader>
        {offer.studiedToday && offer.affordable && (
          <p className="text-sm text-muted-foreground">
            {t('streakRestore.studiedToday', { next: offer.streak + 1 })}
          </p>
        )}
        {!offer.affordable && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('streakRestore.notEnough', {
              cost: offer.cost,
              balance: status.balance,
              reviews: status.reviewsPerRestore,
            })}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={close} disabled={busy}>
            {offer.affordable ? t('streakRestore.dismiss') : t('streakRestore.close')}
          </Button>
          {offer.affordable && (
            <Button onClick={() => void restore()} disabled={busy}>
              {t('streakRestore.restore', { cost: offer.cost })}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
