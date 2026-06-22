'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="font-semibold">Flashcards</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        {status === 'loading' ? null : session?.user ? (
          <>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void signOut({ callbackUrl: '/' });
              }}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
