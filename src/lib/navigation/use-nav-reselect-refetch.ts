'use client';

import { useEffect } from 'react';
import { NAV_RESELECT_EVENT } from '@/lib/navigation/nav-reselect';

type RefetchFn = () => void | Promise<unknown>;

export function useNavReselectRefetch(href: string, refetch: RefetchFn) {
  useEffect(() => {
    const handleReselect = (event: Event) => {
      const customEvent = event as CustomEvent<{ href?: string }>;
      if (customEvent.detail?.href === href) {
        void refetch();
      }
    };

    window.addEventListener(NAV_RESELECT_EVENT, handleReselect);
    return () => {
      window.removeEventListener(NAV_RESELECT_EVENT, handleReselect);
    };
  }, [href, refetch]);
}
