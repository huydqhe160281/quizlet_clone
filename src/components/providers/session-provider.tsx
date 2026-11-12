'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

/**
 * `session` comes from the server render, so the navbar, streak badge and account
 * queries have the signed-in user on first paint instead of waiting for a client
 * `/api/auth/session` round trip.
 */
export function AuthSessionProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
    </SessionProvider>
  );
}
