'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  BookOpen,
  Globe,
  KeyRound,
  LogOut,
  Palette,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LanguagePicker } from '@/components/i18n/LanguagePicker';
import { ThemePicker } from '@/components/layout/ThemePicker';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import { ChangePasswordForm } from '@/features/settings/components/ChangePasswordForm';
import { EmailVerificationNotice } from '@/features/settings/components/EmailVerificationNotice';
import { StudySoundToggle } from '@/features/settings/components/StudySoundToggle';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import type { AccountSummary } from '@/features/settings/types';

type SectionProps = {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
};

function SettingsSection({ id, icon: Icon, title, description, children }: SectionProps) {
  return (
    <Card className="p-4 sm:p-6" aria-labelledby={`${id}-title`} role="region">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-base font-bold leading-tight">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function AccountRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
        {children}
      </dd>
    </div>
  );
}

export function SettingsPageClient({ account }: { account: AccountSummary }) {
  const t = useTranslations();
  const signOut = useSignOut();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t('settingsPage.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('settingsPage.subtitle')}</p>
      </header>

      <SettingsSection
        id="appearance"
        icon={Palette}
        title={t('settingsPage.appearance.title')}
        description={t('settingsPage.appearance.description')}
      >
        <ThemePicker />
      </SettingsSection>

      <SettingsSection
        id="study"
        icon={BookOpen}
        title={t('settingsPage.study.title')}
        description={t('settingsPage.study.description')}
      >
        <StudySoundToggle />
      </SettingsSection>

      <SettingsSection
        id="language"
        icon={Globe}
        title={t('settingsPage.language.title')}
        description={t('settingsPage.language.description')}
      >
        <LanguagePicker />
      </SettingsSection>

      <SettingsSection id="account" icon={UserRound} title={t('settingsPage.account.title')}>
        <dl className="divide-y divide-border/60">
          {account.name && (
            <AccountRow label={t('settingsPage.account.name')}>
              <span className="truncate">{account.name}</span>
            </AccountRow>
          )}
          <AccountRow label={t('settingsPage.account.email')}>
            <span className="truncate">{account.email}</span>
            <Badge variant={account.emailVerified ? 'secondary' : 'outline'} className="shrink-0">
              {account.emailVerified
                ? t('settingsPage.account.verified')
                : t('settingsPage.account.unverified')}
            </Badge>
          </AccountRow>
        </dl>
        {!account.emailVerified && <EmailVerificationNotice email={account.email} />}
      </SettingsSection>

      <SettingsSection
        id="password"
        icon={KeyRound}
        title={t('settingsPage.password.title')}
        description={account.hasPassword ? t('settingsPage.password.description') : undefined}
      >
        {account.hasPassword ? (
          <ChangePasswordForm />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('settingsPage.password.oauthOnly')}{' '}
            <Link href="/forgot-password" className="font-medium text-primary underline">
              {t('settingsPage.password.forgotLink')}
            </Link>
          </p>
        )}
      </SettingsSection>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="text-sm text-muted-foreground">
          {t('settingsPage.account.signOutDescription')}
        </p>
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive hover:text-destructive sm:w-auto"
          onClick={() => void signOut()}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {t('settingsPage.account.signOut')}
        </Button>
      </Card>
    </div>
  );
}
