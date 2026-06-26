import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { env } from '@/config/env';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading…</div>}>
      <LoginForm googleAuthEnabled={env.googleAuthEnabled} />
    </Suspense>
  );
}
