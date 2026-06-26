import type { Metadata } from 'next';
import { env } from '@/config/env';
import { siteConfig } from '@/lib/seo/site-config';

export const getSiteUrl = (): string => env.authUrl;

const buildOpenGraph = (
  title: string,
  description: string,
  path: string
): NonNullable<Metadata['openGraph']> => ({
  type: 'website',
  locale: siteConfig.locale,
  url: `${getSiteUrl()}${path === '/' ? '' : path}`,
  siteName: siteConfig.name,
  title,
  description,
  images: [
    {
      url: siteConfig.ogImagePath,
      width: 512,
      height: 512,
      alt: siteConfig.name,
    },
  ],
});

const buildTwitter = (title: string, description: string): NonNullable<Metadata['twitter']> => ({
  card: 'summary_large_image',
  title,
  description,
  images: [siteConfig.ogImagePath],
});

type PageMetadataOptions = {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
  robots?: Metadata['robots'];
};

export const createRootMetadata = (): Metadata => ({
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteConfig.title,
    template: siteConfig.titleTemplate,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: buildOpenGraph(siteConfig.title, siteConfig.description, '/'),
  twitter: buildTwitter(siteConfig.title, siteConfig.description),
});

export const createPageMetadata = ({
  title,
  description = siteConfig.description,
  path = '/',
  keywords,
  robots,
}: PageMetadataOptions = {}): Metadata => {
  const resolvedTitle = title ?? siteConfig.title;
  const canonicalPath = path === '' ? '/' : path;

  return {
    ...(title ? { title: resolvedTitle } : {}),
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: canonicalPath,
    },
    ...(robots ? { robots } : {}),
    openGraph: buildOpenGraph(resolvedTitle, description, canonicalPath),
    twitter: buildTwitter(resolvedTitle, description),
  };
};

export const createNoIndexMetadata = (): Metadata => ({
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
});

export const buildRootJsonLd = () => {
  const siteUrl = getSiteUrl();

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: siteConfig.name,
        url: siteUrl,
        description: siteConfig.description,
        inLanguage: siteConfig.language,
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: siteConfig.name,
        url: siteUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}${siteConfig.ogImagePath}`,
        },
      },
      {
        '@type': 'WebApplication',
        '@id': `${siteUrl}/#webapp`,
        name: siteConfig.name,
        url: siteUrl,
        description: siteConfig.description,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requires JavaScript',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'VND',
        },
      },
    ],
  };
};
