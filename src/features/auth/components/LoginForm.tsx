'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleButton } from '@/features/auth/components/GoogleButton';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/dashboard';
  }
  return raw;
}

type LoginFormProps = {
  googleAuthEnabled?: boolean;
};

export function LoginForm({ googleAuthEnabled = false }: LoginFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (searchParams.get('error') === 'OAuthAccountNotLinked') {
      return t('auth.oauthNotLinked');
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn('credentials', {
      email,
      password,
      rememberMe: String(rememberMe),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t('auth.invalidCredentials'));
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <Card className="glass-panel relative overflow-hidden rounded-2xl border-border/50 shadow-xl">
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="relative z-10 text-center">
        <CardTitle className="text-2xl font-bold">{t('auth.signInTitle')}</CardTitle>
        <CardDescription>{t('auth.signInSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        {googleAuthEnabled ? <GoogleButton /> : null}
        {googleAuthEnabled ? (
          <div className="relative text-center text-xs uppercase text-muted-foreground">
            <span className="bg-card px-2">{t('auth.or')}</span>
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
              {t('auth.rememberMe')}
            </Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.submitting') : t('auth.submit')}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="text-primary hover:underline">
            {t('auth.forgotPassword')}
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="text-primary hover:underline">
            {t('auth.registerLink')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
