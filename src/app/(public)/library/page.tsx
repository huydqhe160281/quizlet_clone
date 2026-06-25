import type { Metadata } from 'next';
import { LibraryPageClient } from '@/features/library/components/LibraryPageClient';
import { createPageMetadata } from '@/lib/seo/metadata';
import { getCachedPublicLibrary } from '@/server/services/search.service';

export const revalidate = 3600;

export const metadata: Metadata = createPageMetadata({
  title: 'Thư viện công khai',
  description:
    'Khám phá và sao chép các bộ thẻ ghi nhớ công khai từ cộng đồng QuizFree. Học tập và ôn thi miễn phí.',
  path: '/library',
});

export default async function LibraryPage() {
  const initialData = await getCachedPublicLibrary({ sort: 'newest', limit: 20 });
  return <LibraryPageClient initialData={initialData} />;
}
