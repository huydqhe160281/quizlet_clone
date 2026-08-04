'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Serwist } from '@serwist/window';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { shouldRegisterServiceWorker } from '@/features/pwa/sw-policy';

type PwaProviderProps = {
  children: ReactNode;
};

/**
 * Registers Serwist inside LocaleProvider via useEffect.
 * Do not use SerwistProvider's useState init — it stays null after SSR when
 * disable starts true or when the initializer runs without `window`.
 */
export function PwaProvider({ children }: PwaProviderProps) {
  const t = useTranslations();
  const tRef = useRef(t);
  tRef.current = t;
  const shownRef = useRef(false);

  // Mount-only: registering is a one-time side effect. `t` changes on every
  // router.refresh() (fresh catalog object from the server), which would
  // otherwise re-run this effect and re-invoke serwist.register() — a no-op
  // guard only exists in dev, so production would silently re-register on
  // every refresh (login, locale switch, mutations, etc). Read the latest
  // translations via tRef instead so the toast still shows current copy.
  useEffect(() => {
    const allow = shouldRegisterServiceWorker({
      nodeEnv: process.env.NODE_ENV,
      pwaDevFlag: process.env.NEXT_PUBLIC_PWA_DEV,
      isSecureContext: window.isSecureContext,
    });
    if (!allow || !('serviceWorker' in navigator)) return;

    const serwist =
      window.serwist instanceof Serwist
        ? window.serwist
        : new Serwist('/sw.js', { scope: '/', type: 'classic' });
    window.serwist = serwist;

    const onWaiting = () => {
      if (shownRef.current) return;
      shownRef.current = true;
      const translate = tRef.current;
      toast(translate('pwa.updateAvailable'), {
        description: translate('pwa.updateReloadWarning'),
        duration: Infinity,
        action: {
          label: translate('pwa.updateReload'),
          onClick: () => {
            serwist.messageSkipWaiting();
            window.location.reload();
          },
        },
      });
    };

    serwist.addEventListener('waiting', onWaiting);
    void serwist.register();

    return () => {
      serwist.removeEventListener('waiting', onWaiting);
    };
  }, []);

  return <>{children}</>;
}
