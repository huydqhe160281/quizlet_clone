'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { reloadOnceForChunkError } from '@/lib/chunk-error';

/** Route-level error UI (server render or client error below the root layout). */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (reloadOnceForChunkError(error)) {
      setReloading(true);
      return;
    }
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
      <h1 className="text-xl font-semibold">{t('errorPage.title')}</h1>
      <p className="text-sm text-muted-foreground" role="status">
        {reloading ? t('errorPage.reloading') : t('errorPage.body')}
      </p>
      {!reloading ? (
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>{t('errorPage.retry')}</Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">{t('errorPage.home')}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
