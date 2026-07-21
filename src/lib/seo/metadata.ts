import type { Metadata } from 'next';
import { env } from '@/config/env';
import { siteConfig } from '@/lib/seo/site-config';
import { OG_LOCALE_MAP, type Locale, DEFAULT_LOCALE } from '@/lib/i18n/constants';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';

export const getSiteUrl = (): string => env.authUrl;

const buildOpenGraph = (
  title: string,
  description: string,
  path: string,
  locale: Locale = DEFAULT_LOCALE
): NonNullable<Metadata['openGraph']> => ({
  type: 'website',
  locale: OG_LOCALE_MAP[locale],
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
  locale?: Locale;
};

export const createRootMetadata = (locale: Locale = DEFAULT_LOCALE): Metadata => {
  const catalog = loadCatalog(locale);
  const title = t(catalog, 'seo.title') || siteConfig.title;
  const description = t(catalog, 'seo.description') || siteConfig.description;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: title,
      template: siteConfig.titleTemplate,
    },
    description,
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
    openGraph: buildOpenGraph(title, description, '/', locale),
    twitter: buildTwitter(title, description),
  };
};

export const createPageMetadata = ({
  title,
  description = siteConfig.description,
  path = '/',
  keywords,
  robots,
  locale = DEFAULT_LOCALE,
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
    openGraph: buildOpenGraph(resolvedTitle, description, canonicalPath, locale),
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
