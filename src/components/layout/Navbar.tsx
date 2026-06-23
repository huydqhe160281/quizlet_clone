'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="glass-nav flex h-16 items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-2 md:hidden">
        <span className="font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
          Flashcards
        </span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {status === 'loading' ? null : session?.user ? (
          <>
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
              {session.user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full hover:bg-muted/50"
              onClick={() => {
                void signOut({ callbackUrl: '/' });
              }}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild className="rounded-full hover:bg-muted/50">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild className="rounded-full shadow-lg shadow-primary/20">
              <Link href="/register">Get started</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
