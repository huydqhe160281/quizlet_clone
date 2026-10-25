'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { apiErrorMessage, readErrorPayload } from '@/lib/i18n/api-error-message';

export function ChangePasswordForm() {
  const t = useTranslations();
  const signOut = useSignOut();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirm) {
      setError(t('settingsPage.password.mismatch'));
      return;
    }
    if (newPassword === currentPassword) {
      setError(t('settingsPage.password.sameAsCurrent'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.ok) {
        const payload = await readErrorPayload(response);
        setError(apiErrorMessage(t, payload, 'settingsPage.password.failed'));
        setLoading(false);
        return;
      }
    } catch {
      setError(t('settingsPage.password.failed'));
      setLoading(false);
      return;
    }

    // Every session was revoked server-side, this one included.
    toast.success(t('settingsPage.password.success'));
    await signOut('/login');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-password">{t('settingsPage.password.current')}</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-password">{t('settingsPage.password.new')}</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            aria-describedby="new-password-hint"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <p id="new-password-hint" className="text-xs text-muted-foreground">
            {t('settingsPage.password.hint')}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">{t('settingsPage.password.confirm')}</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
        {loading ? t('settingsPage.password.submitting') : t('settingsPage.password.submit')}
      </Button>
    </form>
  );
}
