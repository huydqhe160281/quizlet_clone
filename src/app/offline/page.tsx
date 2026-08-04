import type { Metadata } from 'next';
import { OfflinePageClient } from '@/features/pwa/OfflinePageClient';

export const metadata: Metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflinePageClient />;
}
