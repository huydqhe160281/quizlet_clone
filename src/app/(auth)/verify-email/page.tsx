import { Suspense } from 'react';
import { VerifyEmailStatus } from '@/features/auth/components/VerifyEmailStatus';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading…</div>}>
      <VerifyEmailStatus />
    </Suspense>
  );
}
