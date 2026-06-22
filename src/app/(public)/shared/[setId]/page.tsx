import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api-error';
import { SharedSetPreview } from '@/features/library/components/SharedSetPreview';
import { getPublicSetPreview } from '@/server/services/search.service';

type PageProps = { params: Promise<{ setId: string }> };

export const revalidate = 300;

export default async function SharedSetPage({ params }: PageProps) {
  const { setId } = await params;

  try {
    const set = await getPublicSetPreview(setId);
    return <SharedSetPreview set={set} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
