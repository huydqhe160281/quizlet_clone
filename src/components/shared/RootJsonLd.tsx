import { buildRootJsonLd } from '@/lib/seo/metadata';

export function RootJsonLd() {
  const jsonLd = buildRootJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
