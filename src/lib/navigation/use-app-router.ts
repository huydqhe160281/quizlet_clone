'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { startNavigationProgress } from '@/lib/navigation/navigation-progress';

/** `useRouter` whose `push` / `replace` also show the navigation progress bar. */
export function useAppRouter() {
  const router = useRouter();
  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        startNavigationProgress(args[0]);
        router.push(...args);
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        startNavigationProgress(args[0]);
        router.replace(...args);
      },
    }),
    [router]
  );
}
