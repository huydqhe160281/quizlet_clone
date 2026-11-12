import { SearchPageClient } from '@/features/search/components/SearchPageClient';
import { createNoIndexMetadata, createPageMetadata } from '@/lib/seo/metadata';
import { getCachedPublicLibrary } from '@/server/services/search.service';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';

export const revalidate = 3600;

export async function generateMetadata() {
  const locale = await getRequestLocale();
  const catalog = loadCatalog(locale);
  return {
    ...createPageMetadata({
      path: '/search',
      locale,
      title: t(catalog, 'seo.searchTitle'),
      description: t(catalog, 'seo.searchDescription'),
    }),
    ...createNoIndexMetadata(),
  };
}

export default async function SearchPage() {
  const initialData = await getCachedPublicLibrary({ sort: 'newest', limit: 20 });
  // Map Dates to strings if necessary, though Next.js 14+ supports Dates in Server Actions/Props
  return <SearchPageClient initialData={initialData} />;
}
