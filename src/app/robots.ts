import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/metadata';
import { robotsDisallowPaths } from '@/lib/seo/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...robotsDisallowPaths],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
