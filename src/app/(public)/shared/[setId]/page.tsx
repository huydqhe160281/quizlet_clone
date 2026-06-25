import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api-error';
import { SharedSetPreview } from '@/features/library/components/SharedSetPreview';
import { createPageMetadata } from '@/lib/seo/metadata';
import { siteConfig } from '@/lib/seo/site-config';
import { getPublicSetPreview } from '@/server/services/search.service';

type PageProps = { params: Promise<{ setId: string }> };

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { setId } = await params;

  try {
    const set = await getPublicSetPreview(setId);
    const description =
      set.description?.trim() ||
      `Xem và học bộ thẻ "${set.title}" trên ${siteConfig.name} — học tập và ôn thi miễn phí.`;

    return createPageMetadata({
      title: set.title,
      description,
      path: `/shared/${setId}`,
    });
  } catch {
    return createPageMetadata({
      title: 'Bộ thẻ không tìm thấy',
      path: `/shared/${setId}`,
      robots: { index: false, follow: false },
    });
  }
}

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
