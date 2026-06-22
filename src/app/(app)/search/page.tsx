import { SearchPageClient } from '@/features/search/components/SearchPageClient';
import { getCachedPublicLibrary } from '@/server/services/search.service';

export const revalidate = 3600;

export default async function SearchPage() {
  const initialData = await getCachedPublicLibrary({ sort: 'newest', limit: 20 });
  // Map Dates to strings if necessary, though Next.js 14+ supports Dates in Server Actions/Props
  return <SearchPageClient initialData={initialData} />;
}
