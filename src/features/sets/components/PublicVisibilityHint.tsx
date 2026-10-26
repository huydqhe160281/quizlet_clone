'use client';

import Link from 'next/link';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

/** Explains why "Public" is disabled for an account without a verified email. */
export function PublicVisibilityHint() {
  const t = useTranslations();
  return (
    <p className="text-xs text-muted-foreground">
      {t('setsPage.publicNeedsVerification')}{' '}
      <Link href="/settings#account-title" className="font-medium text-primary underline">
        {t('setsPage.goToSettings')}
      </Link>
    </p>
  );
}
