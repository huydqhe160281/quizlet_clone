import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/metadata';
import { sitemapStaticPaths } from '@/lib/seo/site-config';
import { getPublicSetSitemapEntries } from '@/server/services/search.service';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  const publicSets = await getPublicSetSitemapEntries();

  const staticEntries: MetadataRoute.Sitemap = sitemapStaticPaths.map((path) => ({
    url: `${baseUrl}${path || '/'}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.8,
  }));

  const sharedEntries: MetadataRoute.Sitemap = publicSets.map((set) => ({
    url: `${baseUrl}/shared/${set.id}`,
    lastModified: set.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticEntries, ...sharedEntries];
}
