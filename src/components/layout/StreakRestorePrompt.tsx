'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Flame } from 'lucide-react';
import { toast } from 'sonner';
import { RestoreHearts } from '@/components/streak/RestoreHearts';
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

const CRACK_MS = 900;

/** Offers to restore a streak broken by 1–3 missed days when the user comes back. */
export function StreakRestorePrompt() {
  const t = useTranslations();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [status, setStatus] = useState<StreakRestoreStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cracked, setCracked] = useState(false);

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
      // Let the spent hearts crack before the dialog goes away.
      setStatus((prev) => (prev ? { ...prev, balance: result.balance } : prev));
      setCracked(true);
      await new Promise((resolve) => setTimeout(resolve, CRACK_MS));
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
        <RestoreHearts
          className="justify-center py-1"
          size={30}
          balance={status.balance}
          max={status.maxBalance}
          pending={offer.affordable && !cracked ? offer.cost : 0}
          label={t('streakRestore.heartsAria', {
            balance: status.balance,
            max: status.maxBalance,
          })}
        />
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
