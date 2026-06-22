import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Flashcards — Learn smarter',
  description: 'A Quizlet-inspired flashcard app for spaced repetition study.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <QueryProvider>
          <AuthSessionProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </AuthSessionProvider>
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
