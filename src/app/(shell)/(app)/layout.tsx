import { redirect } from 'next/navigation';
import { EmailVerificationBanner } from '@/features/auth/components/EmailVerificationBanner';
import { getServerSession } from '@/server/auth/auth-utils';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware only verifies the JWT signature; a revoked session (password reset
  // elsewhere) is caught here, where the DB-backed check runs, and its cookie cleared.
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect('/api/v1/auth/session-expired');
  }

  return (
    <>
      <EmailVerificationBanner />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </>
  );
}
