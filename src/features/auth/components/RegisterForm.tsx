'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleButton } from '@/features/auth/components/GoogleButton';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type RegisterFormProps = {
  googleAuthEnabled?: boolean;
};

export function RegisterForm({ googleAuthEnabled = false }: RegisterFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || undefined, email, password }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string; message?: string };
      setError(payload.message ?? payload.error ?? t('auth.registerFailed'));
      setLoading(false);
      return;
    }

    const signInResult = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (signInResult?.error) {
      router.push('/login');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <Card className="glass-panel relative overflow-hidden rounded-2xl border-border/50 shadow-xl">
      <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="relative z-10 text-center">
        <CardTitle className="text-2xl font-bold">{t('auth.signUpTitle')}</CardTitle>
        <CardDescription>{t('auth.signUpSubtitle')}</CardDescription>
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
            <Label htmlFor="name">{t('auth.nameOptional')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.submittingRegister') : t('auth.submitRegister')}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.hasAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline">
            {t('auth.loginLink')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
