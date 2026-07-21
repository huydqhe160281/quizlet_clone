import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { auth } from '@/server/auth/auth';
import { prisma } from '@/server/db';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen relative overflow-clip">
      {/* Ambient background blob */}
      <div className="fixed -top-[500px] -right-[500px] h-[1000px] w-[1000px] rounded-full bg-primary/5 opacity-50 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-[500px] -left-[500px] h-[1000px] w-[1000px] rounded-full bg-primary/5 opacity-50 blur-3xl pointer-events-none" />

      <Sidebar />
      <div className="flex flex-1 flex-col pb-16 sm:pb-0 z-10 min-w-0">
        <Navbar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
