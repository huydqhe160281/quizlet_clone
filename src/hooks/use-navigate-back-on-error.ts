'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { navigateBack } from '@/lib/navigation/navigate-back';

export function useNavigateBackOnError(error: unknown, fallbackHref: string): void {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!error || handledRef.current) {
      return;
    }

    handledRef.current = true;
    navigateBack(router, fallbackHref);
  }, [error, fallbackHref, router]);
}
