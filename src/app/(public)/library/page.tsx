import { LibraryPageClient } from '@/features/library/components/LibraryPageClient';

export const revalidate = 300;

export default function LibraryPage() {
  return <LibraryPageClient />;
}
