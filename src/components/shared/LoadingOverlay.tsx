'use client';

import { Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type LoadingOverlayProps = {
  visible: boolean;
  message?: string;
};

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const t = useTranslations();

  if (!visible || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex cursor-wait items-center justify-center bg-black/40"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <Loader2 className="h-10 w-10 animate-spin text-white" aria-hidden />
      <span className="sr-only">{message ?? t('ui.loading')}</span>
    </div>,
    document.body
  );
}
