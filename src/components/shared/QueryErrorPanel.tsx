'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type QueryErrorPanelProps = {
  message: string;
  onRetry?: () => void | Promise<unknown>;
};

export function QueryErrorPanel({ message, onRetry }: QueryErrorPanelProps) {
  const t = useTranslations();

  return (
    <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry ? (
        <Button type="button" size="sm" variant="outline" onClick={() => void onRetry()}>
          {t('ui.retry')}
        </Button>
      ) : null}
    </div>
  );
}
