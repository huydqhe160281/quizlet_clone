'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { BookOpen, LogOut, Settings, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StreakBadge } from '@/components/layout/StreakBadge';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

export function Navbar() {
  const { data: session, status } = useSession();
  const t = useTranslations();
  const signOut = useSignOut();

  const userInitials = (session?.user?.name ?? session?.user?.email ?? 'U')
    .slice(0, 2)
    .toUpperCase();

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

      <div className="flex items-center gap-2 md:gap-3">
        {status === 'loading' ? null : session?.user ? (
          <>
            <StreakBadge />
            {/* Theme and language live on /settings, so the menu stays short as they grow. */}
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

              <DropdownMenuContent align="end" className="w-60 max-w-[calc(100vw-1.5rem)]">
                <div className="px-2.5 py-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {session.user.name ?? session.user.email}
                  </p>
                  {session.user.name && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {session.user.email}
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-2.5 cursor-pointer">
                  <Link href="/settings">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    {t('nav.settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void signOut()}
                  className="gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-1.5 md:gap-3">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            <ThemeToggle />
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
