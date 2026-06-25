import type { Metadata } from 'next';
import { SearchPageClient } from '@/features/search/components/SearchPageClient';
import { createNoIndexMetadata, createPageMetadata } from '@/lib/seo/metadata';
import { getCachedPublicLibrary } from '@/server/services/search.service';

export const revalidate = 3600;

export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'Tìm kiếm bộ thẻ',
    description: 'Tìm kiếm bộ thẻ ghi nhớ công khai trên QuizFree.',
    path: '/search',
  }),
  ...createNoIndexMetadata(),
};

export default async function SearchPage() {
  const initialData = await getCachedPublicLibrary({ sort: 'newest', limit: 20 });
  // Map Dates to strings if necessary, though Next.js 14+ supports Dates in Server Actions/Props
  return <SearchPageClient initialData={initialData} />;
}
