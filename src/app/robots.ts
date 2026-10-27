import type { MetadataRoute } from 'next';
import { isIndexableDeployment } from '@/config/env';
import { getSiteUrl } from '@/lib/seo/metadata';
import { robotsDisallowPaths } from '@/lib/seo/site-config';

export default function robots(): MetadataRoute.Robots {
  // Preview deployments duplicate production content; keep them out of the index.
  if (!isIndexableDeployment()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...robotsDisallowPaths],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
