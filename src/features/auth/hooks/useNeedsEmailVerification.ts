'use client';

import { useSession } from 'next-auth/react';
import { useAccountStatus } from '@/features/auth/hooks/useAccountStatus';

/** True once /api/v1/auth/me confirms a password account has not verified its email. */
export function useNeedsEmailVerification(): boolean {
  const { data: session } = useSession();
  const { data: account } = useAccountStatus(session?.user?.id);
  return account?.needsEmailVerification === true;
}
