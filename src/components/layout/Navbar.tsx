'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { BookOpen, Globe, LogOut, Moon, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StreakBadge } from '@/components/layout/StreakBadge';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/constants';
import { persistLocaleClient } from '@/lib/i18n/client-locale';
import { useLocale, useTranslations } from '@/lib/i18n/LocaleProvider';
import { flushPendingMutationsBeforeSignOut } from '@/features/study-offline/flush-before-signout';

function writeLocaleCookie(locale: Locale) {
  persistLocaleClient(locale);
}

export function Navbar() {
  const { data: session, status } = useSession();
  const { setTheme, resolvedTheme } = useTheme();
  const locale = useLocale();
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSignOut = async () => {
    await flushPendingMutationsBeforeSignOut(session?.user?.id).catch(() => {});
    void signOut({ callbackUrl: '/' });
  };

  const onSelectLocale = (next: Locale) => {
    if (next === locale || pending) return;
    writeLocaleCookie(next);
    startTransition(() => {
      void (async () => {
        if (status === 'authenticated') {
          try {
            await fetch('/api/v1/user/preferences', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ preferredLocale: next }),
            });
          } catch {
            // soft-fail
          }
        }
        router.refresh();
      })();
    });
  };

  const userInitials = session?.user?.name
    ? session.user.name.slice(0, 2).toUpperCase()
    : session?.user?.email
      ? session.user.email.slice(0, 2).toUpperCase()
      : 'U';

  return (
    <header className="glass-nav flex h-14 sm:h-16 md:h-20 items-center justify-between px-3 md:px-6 sticky top-0 z-40 shadow-sm">
      {/* Left: App logo (mobile only — desktop sidebar has logo) */}
      <div className="flex items-center gap-2 sm:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/20">
          <BookOpen className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-extrabold text-lg tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {t('app.name')}
        </span>
      </div>
      {/* Spacer on desktop (sidebar provides the logo) */}
      <div className="hidden sm:block" />

      {/* Right side controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Desktop-only: Expanded Language & Theme */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        {/* Streak is visible on both, placed before user controls */}
        {status !== 'loading' && session?.user && <StreakBadge />}

        {status === 'loading' ? null : session?.user ? (
          <>
            {/* Desktop-only: Email and Logout button */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground max-w-[140px] truncate">
                {session.user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl hover:bg-muted/80 font-semibold transition-all duration-300"
                onClick={() => {
                  void handleSignOut();
                }}
              >
                {t('nav.signOut')}
              </Button>
            </div>

            {/* Mobile/Tablet-only: Compact Avatar Dropdown */}
            <div className="md:hidden flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center justify-center rounded-full ring-2 ring-border/50 hover:ring-primary/50 transition-all duration-200 focus:outline-none focus-visible:ring-primary"
                    aria-label={t('nav.userMenu')}
                  >
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                      <AvatarImage
                        src={session.user.image ?? undefined}
                        alt={session.user.name ?? ''}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2.5 py-2 border-b border-border/40 mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {session.user.name ?? session.user.email}
                    </p>
                    {session.user.name && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {session.user.email}
                      </p>
                    )}
                  </div>

                  <DropdownMenuItem
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    className="gap-2.5"
                  >
                    {resolvedTheme === 'dark' ? (
                      <Sun className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Moon className="h-4 w-4 text-indigo-400" />
                    )}
                    {resolvedTheme === 'dark' ? t('ui.theme.light') : t('ui.theme.dark')}
                  </DropdownMenuItem>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Globe className="h-4 w-4 text-primary/70" />
                        <span className="flex-1">{t('nav.language')}</span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {t(`language.${locale}`)}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="left" align="start" className="w-36">
                      {SUPPORTED_LOCALES.map((code) => (
                        <DropdownMenuItem
                          key={code}
                          onClick={() => onSelectLocale(code)}
                          className={code === locale ? 'font-bold text-primary' : ''}
                        >
                          {t(`language.${code}`)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="border-t border-border/40 mt-1 pt-1">
                    <DropdownMenuItem
                      onClick={() => {
                        void handleSignOut();
                      }}
                      className="gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('nav.signOut')}
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="rounded-xl hover:bg-muted/80 font-semibold transition-all duration-300 text-sm px-3"
            >
              <Link href="/login" aria-label={t('nav.login')}>
                <User className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">{t('nav.login')}</span>
              </Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="rounded-xl shadow-lg shadow-primary/25 font-semibold transition-all duration-300 hover:scale-105 text-sm px-3"
            >
              <Link href="/register" aria-label={t('nav.register')}>
                <span className="hidden sm:inline">{t('nav.register')}</span>
                <span className="sm:hidden" aria-hidden="true">
                  +
                </span>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
