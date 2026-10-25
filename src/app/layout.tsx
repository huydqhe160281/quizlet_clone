import type { Viewport } from 'next';
import { Be_Vietnam_Pro, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
// Theme skins load after globals so they win over Tailwind utilities at equal specificity.
import '@/styles/themes/pastel.css';
import '@/styles/themes/paper.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { LoadingOverlayProvider } from '@/components/providers/loading-overlay-provider';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import { RootJsonLd } from '@/components/shared/RootJsonLd';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { GuideProviders } from '@/features/guide/components/GuideProviders';
import { createRootMetadata } from '@/lib/seo/metadata';
import { siteConfig } from '@/lib/seo/site-config';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { THEME_IDS, THEME_STORAGE_KEY } from '@/lib/theme/themes';
import { PwaProvider } from '@/features/pwa/PwaProvider';
import { StudyOfflineSyncProvider } from '@/features/study-offline/StudyOfflineSyncProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
// Paper & Ink body font (full Vietnamese coverage); only referenced by styles/themes/paper.css,
// so with preload off the files are fetched only when that theme is active.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-paper',
  display: 'swap',
  preload: false,
});

export async function generateMetadata() {
  const locale = await getRequestLocale();
  return {
    ...createRootMetadata(locale),
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    category: 'education',
  };
}

// `cover` makes env(safe-area-inset-*) report the notch / home-bar insets the
// fixed mobile bars pad for; without it they are always 0.
export const viewport: Viewport = { viewportFit: 'cover' };

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const catalog = loadCatalog(locale);

  return (
    <html lang={locale} className={beVietnamPro.variable} suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-screen font-sans antialiased bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-background`}
      >
        <RootJsonLd />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={THEME_IDS}
          storageKey={THEME_STORAGE_KEY}
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthSessionProvider>
              <LocaleProvider locale={locale} catalog={catalog}>
                <PwaProvider>
                  <StudyOfflineSyncProvider>
                    <LoadingOverlayProvider>
                      <ErrorBoundary>
                        <GuideProviders>{children}</GuideProviders>
                      </ErrorBoundary>
                    </LoadingOverlayProvider>
                  </StudyOfflineSyncProvider>
                </PwaProvider>
              </LocaleProvider>
            </AuthSessionProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
