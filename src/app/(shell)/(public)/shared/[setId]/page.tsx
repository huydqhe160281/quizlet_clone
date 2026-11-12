import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api-error';
import { SharedSetPreview } from '@/features/library/components/SharedSetPreview';
import { createPageMetadata } from '@/lib/seo/metadata';
import { siteConfig } from '@/lib/seo/site-config';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';
import { getCachedPublicSetPreview } from '@/server/services/search.service';

type PageProps = { params: Promise<{ setId: string }> };

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { setId } = await params;
  const locale = await getRequestLocale();
  const catalog = loadCatalog(locale);

  try {
    const set = await getCachedPublicSetPreview(setId);
    const description =
      set.description?.trim() ||
      t(catalog, 'seo.sharedSetDefaultDescription', {
        title: set.title,
        appName: siteConfig.name,
      });

    return createPageMetadata({
      title: set.title,
      description,
      path: `/shared/${setId}`,
      locale,
    });
  } catch {
    return createPageMetadata({
      title: t(catalog, 'seo.sharedSetNotFoundTitle'),
      path: `/shared/${setId}`,
      robots: { index: false, follow: false },
      locale,
    });
  }
}

export default async function SharedSetPage({ params }: PageProps) {
  const { setId } = await params;

  try {
    const set = await getCachedPublicSetPreview(setId);
    return <SharedSetPreview set={set} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
