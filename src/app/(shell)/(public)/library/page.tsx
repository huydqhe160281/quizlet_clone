import { LibraryPageClient } from '@/features/library/components/LibraryPageClient';
import { createPageMetadata } from '@/lib/seo/metadata';
import { getCachedPublicLibrary } from '@/server/services/search.service';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';

export const revalidate = 3600;

export async function generateMetadata() {
  const locale = await getRequestLocale();
  const catalog = loadCatalog(locale);
  return createPageMetadata({
    path: '/library',
    locale,
    title: t(catalog, 'seo.libraryTitle'),
    description: t(catalog, 'seo.libraryDescription'),
  });
}

export default async function LibraryPage() {
  const initialData = await getCachedPublicLibrary({ sort: 'newest', limit: 20 });
  return <LibraryPageClient initialData={initialData} />;
}
