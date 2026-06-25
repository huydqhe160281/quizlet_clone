import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo/site-config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.title,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: siteConfig.themeColor,
    lang: siteConfig.language,
    icons: [
      {
        src: siteConfig.ogImagePath,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: siteConfig.ogImagePath,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
