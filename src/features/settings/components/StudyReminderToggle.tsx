'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

const ENDPOINT = '/api/v1/user/push-subscription';

type Status =
  | 'loading'
  | 'unsupported'
  | 'ios-install'
  | 'no-worker'
  | 'unavailable'
  | 'denied'
  | 'ready';

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIosBrowserTab() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

async function sendSubscription(method: 'POST' | 'DELETE', body: unknown) {
  const response = await fetch(ENDPOINT, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`push-subscription ${method} ${response.status}`);
}

/** Per-device opt-in for the daily study reminder (Web Push via the app's service worker). */
export function StudyReminderToggle() {
  const t = useTranslations();
  const [status, setStatus] = useState<Status>('loading');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const getRegistration = useCallback(
    () => navigator.serviceWorker.getRegistration('/').then((reg) => reg ?? null),
    []
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      const supported =
        'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if (!supported) {
        if (active) setStatus(isIosBrowserTab() ? 'ios-install' : 'unsupported');
        return;
      }
      const registration = await getRegistration();
      if (!registration) {
        if (active) setStatus('no-worker');
        return;
      }
      const response = await fetch(ENDPOINT).catch(() => null);
      const key = response?.ok
        ? ((await response.json()) as { data: { publicKey: string | null } }).data.publicKey
        : null;
      if (!key) {
        if (active) setStatus('unavailable');
        return;
      }
      const existing = await registration.pushManager.getSubscription();
      const granted = Notification.permission === 'granted';
      if (existing && granted) {
        // Re-attach to whoever is signed in now (the same browser may switch accounts).
        void sendSubscription('POST', existing.toJSON()).catch(() => {});
      }
      if (!active) return;
      setPublicKey(key);
      setSubscribed(Boolean(existing) && granted);
      setStatus(Notification.permission === 'denied' ? 'denied' : 'ready');
    })().catch(() => {
      if (active) setStatus('unsupported');
    });
    return () => {
      active = false;
    };
  }, [getRegistration]);

  const enable = async () => {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      if (permission === 'denied') setStatus('denied');
      return;
    }
    const registration = await getRegistration();
    if (!registration || !publicKey) throw new Error('push not ready');
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));
    await sendSubscription('POST', subscription.toJSON());
    setSubscribed(true);
    toast.success(t('settingsPage.study.reminderEnabled'));
  };

  const disable = async () => {
    const registration = await getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await sendSubscription('DELETE', { endpoint: subscription.endpoint }).catch(() => {});
      await subscription.unsubscribe();
    }
    setSubscribed(false);
    toast.success(t('settingsPage.study.reminderDisabled'));
  };

  const onCheckedChange = async (checked: boolean) => {
    setBusy(true);
    try {
      await (checked ? enable() : disable());
    } catch {
      toast.error(t('settingsPage.study.reminderFailed'));
    } finally {
      setBusy(false);
    }
  };

  const notice =
    status === 'unsupported'
      ? t('settingsPage.study.reminderUnsupported')
      : status === 'ios-install'
        ? t('settingsPage.study.reminderIosHint')
        : status === 'no-worker'
          ? t('settingsPage.study.reminderNeedsInstall')
          : status === 'unavailable'
            ? t('settingsPage.study.reminderUnavailable')
            : status === 'denied'
              ? t('settingsPage.study.reminderDenied')
              : null;

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="study-reminder-enabled"
        className="mt-0.5"
        checked={subscribed}
        disabled={status !== 'ready' || busy}
        onCheckedChange={(checked) => void onCheckedChange(checked === true)}
      />
      <div className="space-y-0.5">
        <Label htmlFor="study-reminder-enabled" className="cursor-pointer font-semibold">
          {t('settingsPage.study.reminderLabel')}
        </Label>
        <p className="text-sm text-muted-foreground">{t('settingsPage.study.reminderHint')}</p>
        {notice && <p className="text-sm text-amber-600 dark:text-amber-400">{notice}</p>}
      </div>
    </div>
  );
}
