'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

export function ResetPasswordForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError(t('auth.missingResetToken'));
      return;
    }

    if (password !== confirm) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);

    const response = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string; error?: string };
      setError(payload.message ?? payload.error ?? t('auth.resetFailed'));
      return;
    }

    router.push('/login');
  };

  return (
    <Card className="glass-panel relative overflow-hidden rounded-2xl border-border/50 shadow-xl">
      <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="relative z-10 text-center">
        <CardTitle className="text-2xl font-bold">{t('auth.resetPasswordTitle')}</CardTitle>
        <CardDescription>{t('auth.resetPasswordSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.newPassword')}</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{t('auth.confirmPassword')}</Label>
            <Input
              id="confirm"
              type="password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.updating') : t('auth.updatePassword')}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
