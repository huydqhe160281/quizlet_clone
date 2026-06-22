import { LibraryPageClient } from '@/features/library/components/LibraryPageClient';
import { getCachedPublicLibrary } from '@/server/services/search.service';

export const revalidate = 3600;

export default async function LibraryPage() {
  const initialData = await getCachedPublicLibrary({ sort: 'newest', limit: 20 });
  return <LibraryPageClient initialData={initialData} />;
}
