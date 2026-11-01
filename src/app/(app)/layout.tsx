import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileNav, MobileNavSpacer } from '@/components/layout/MobileNav';
import { redirect } from 'next/navigation';
import { EmailVerificationBanner } from '@/features/auth/components/EmailVerificationBanner';
import { auth } from '@/server/auth/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware only verifies the JWT signature; a revoked session (password reset
  // elsewhere) is caught here, where the DB-backed check runs, and its cookie cleared.
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/v1/auth/session-expired');
  }

  return (
    <div className="flex min-h-dvh relative overflow-clip">
      {/* Ambient background blob */}
      <div className="decor-glow fixed -top-[500px] -right-[500px] h-[1000px] w-[1000px] rounded-full bg-primary/5 opacity-50 blur-3xl pointer-events-none" />
      <div className="decor-glow fixed -bottom-[500px] -left-[500px] h-[1000px] w-[1000px] rounded-full bg-primary/5 opacity-50 blur-3xl pointer-events-none" />

      <Sidebar />
      <div className="flex flex-1 flex-col z-10 min-w-0">
        <Navbar />
        <EmailVerificationBanner />
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <MobileNavSpacer />
      </div>
      <MobileNav />
    </div>
  );
}
