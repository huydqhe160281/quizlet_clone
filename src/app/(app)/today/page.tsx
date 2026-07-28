import { TodayPageClient } from '@/features/today/components/TodayPageClient';
import { requireUserId } from '@/server/auth/auth-utils';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  await requireUserId();
  return <TodayPageClient />;
}
