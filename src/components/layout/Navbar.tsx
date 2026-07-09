'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { StreakBadge } from '@/components/layout/StreakBadge';

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="glass-nav flex h-20 items-center justify-between px-4 md:px-8 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-3 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/20">
          <span className="text-primary-foreground font-bold">F</span>
        </div>
        <span className="font-extrabold text-lg tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Flashcards
        </span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {status === 'loading' ? null : session?.user ? (
          <>
            <StreakBadge />
            <span className="hidden text-sm font-medium text-muted-foreground md:inline">
              {session.user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl hover:bg-muted/80 font-semibold transition-all duration-300"
              onClick={() => {
                void signOut({ callbackUrl: '/' });
              }}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="rounded-xl hover:bg-muted/80 font-semibold transition-all duration-300"
            >
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="rounded-xl shadow-lg shadow-primary/25 font-semibold transition-all duration-300 hover:scale-105"
            >
              <Link href="/register">Get started</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
