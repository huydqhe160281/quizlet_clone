import { redirect } from 'next/navigation';
import { SettingsPageClient } from '@/features/settings/components/SettingsPageClient';
import { createNoIndexMetadata } from '@/lib/seo/metadata';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';
import { requireUserId } from '@/server/auth/auth-utils';
import { getAccountSummary } from '@/server/services/user/account.service';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const catalog = loadCatalog(await getRequestLocale());
  return { title: t(catalog, 'settingsPage.title'), ...createNoIndexMetadata() };
}

export default async function SettingsPage() {
  const userId = await requireUserId();
  const account = await getAccountSummary(userId);
  if (!account) redirect('/api/v1/auth/session-expired');

  return <SettingsPageClient account={account} />;
}
