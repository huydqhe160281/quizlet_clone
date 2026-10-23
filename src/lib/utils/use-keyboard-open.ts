'use client';

import { useEffect, useState } from 'react';
import { isCoarsePointer, isTextEntryElement } from '@/lib/utils/touch';

/**
 * Approximates "on-screen keyboard is open": a text field has focus on a touch
 * device. Used to get fixed bottom bars out of the way while the user types.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isCoarsePointer()) return;
    const sync = () => setOpen(isTextEntryElement(document.activeElement));
    // focusout fires before the next element gains focus; defer the read.
    const onFocusOut = () => window.setTimeout(sync, 0);
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', sync);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return open;
}
