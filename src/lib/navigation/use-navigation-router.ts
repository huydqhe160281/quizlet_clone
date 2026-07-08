'use client';

import { useRouter as useNextRouter } from 'next/navigation';
import { useNavigationLoading } from '@/components/providers/loading-overlay-provider';

export function useNavigationRouter() {
  const router = useNextRouter();
  const { startNavLoading } = useNavigationLoading();

  return {
    ...router,
    push: (...args: Parameters<typeof router.push>) => {
      startNavLoading();
      return router.push(...args);
    },
    replace: (...args: Parameters<typeof router.replace>) => {
      startNavLoading();
      return router.replace(...args);
    },
    refresh: () => {
      startNavLoading();
      return router.refresh();
    },
  };
}
