'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setDevResetUrl(null);

    const response = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string; error?: string };
      setError(payload.message ?? payload.error ?? 'Request failed');
      return;
    }

    const { data } = (await response.json()) as { data: { message: string; devResetUrl?: string } };
    setMessage(data.message);
    if (data.devResetUrl) {
      setDevResetUrl(data.devResetUrl);
    }
  };

  return (
    <Card className="glass-panel relative overflow-hidden rounded-2xl border-border/50 shadow-xl">
      <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="relative z-10 text-center">
        <CardTitle className="text-2xl font-bold">Forgot password</CardTitle>
        <CardDescription>We will email you a reset link.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fp-email">Email</Label>
            <Input
              id="fp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          {devResetUrl && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs space-y-1">
              <p className="font-semibold text-amber-700">🛠 Dev mode — no email sent</p>
              <p className="text-amber-600 break-all">
                <a
                  href={devResetUrl}
                  className="underline hover:text-amber-800"
                  target="_blank"
                  rel="noreferrer"
                >
                  {devResetUrl}
                </a>
              </p>
              <button
                type="button"
                className="text-amber-600 underline text-xs"
                onClick={() => void navigator.clipboard.writeText(devResetUrl)}
              >
                Copy link
              </button>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
