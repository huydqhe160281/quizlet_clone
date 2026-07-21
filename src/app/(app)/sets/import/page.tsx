import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requireUserId } from '@/server/auth/auth-utils';
import { ImportSetWizard } from '@/features/sets/components/ImportSetWizard';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';

export default async function ImportSetPage() {
  // Ensure user is authenticated; throws 401 if not
  await requireUserId();
  const locale = await getRequestLocale();
  const catalog = loadCatalog(locale);

  return (
    <main className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link
            href="/sets"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t(catalog, 'setsPage.backToSets')}
          </Link>
        </Button>
      </div>
      <ImportSetWizard variant="page" />
    </main>
  );
}
