import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import { RootJsonLd } from '@/components/seo/RootJsonLd';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { createRootMetadata } from '@/lib/seo/metadata';
import { siteConfig } from '@/lib/seo/site-config';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  ...createRootMetadata(),
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={siteConfig.language} suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-screen font-sans antialiased bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-background`}
      >
        <RootJsonLd />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="flashcards-theme"
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthSessionProvider>
              <ErrorBoundary>{children}</ErrorBoundary>
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
