'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authKeys } from '@/features/auth/query-keys';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type Status = 'verifying' | 'verified' | 'invalid' | 'expired';

export function VerifyEmailStatus() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const token = useSearchParams().get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'invalid');
  const started = useRef(false);

  useEffect(() => {
    // Verify with a POST from the page rather than on GET of the link, so mail scanners
    // that prefetch URLs do not consume the token. The ref stops StrictMode double posts.
    if (!token || started.current) return;
    started.current = true;
    void (async () => {
      try {
        const response = await fetch('/api/v1/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (response.ok) {
          setStatus('verified');
          void queryClient.invalidateQueries({ queryKey: authKeys.me() });
          return;
        }
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setStatus(payload.error === 'TOKEN_EXPIRED' ? 'expired' : 'invalid');
      } catch {
        setStatus('invalid');
      }
    })();
  }, [token, queryClient]);

  const message = {
    verifying: t('auth.verifyingEmail'),
    verified: t('auth.emailVerified'),
    invalid: t('auth.verifyEmailInvalid'),
    expired: t('auth.verifyEmailExpired'),
  }[status];

  return (
    <Card className="glass-panel relative overflow-hidden rounded-2xl border-border/50 shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t('auth.verifyEmailTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p
          role="status"
          className={status === 'invalid' || status === 'expired' ? 'text-destructive' : ''}
        >
          {message}
        </p>
        {status !== 'verifying' ? (
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            {t('auth.continueToApp')}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
