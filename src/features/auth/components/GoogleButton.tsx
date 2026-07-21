'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

export function GoogleButton() {
  const t = useTranslations();

  const handleClick = () => {
    void signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick}>
      {t('auth.continueWithGoogle')}
    </Button>
  );
}
