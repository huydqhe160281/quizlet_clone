import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const catalog = loadCatalog(await getRequestLocale());

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">{t(catalog, 'errorPage.notFoundTitle')}</h1>
      <p className="text-sm text-muted-foreground">{t(catalog, 'errorPage.notFoundBody')}</p>
      <Button asChild>
        <Link href="/dashboard">{t(catalog, 'errorPage.home')}</Link>
      </Button>
    </div>
  );
}
