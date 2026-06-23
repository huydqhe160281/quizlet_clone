import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileNav } from '@/components/layout/MobileNav';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Ambient background blob */}
      <div className="fixed -top-[500px] -right-[500px] h-[1000px] w-[1000px] rounded-full bg-primary/5 opacity-50 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-[500px] -left-[500px] h-[1000px] w-[1000px] rounded-full bg-primary/5 opacity-50 blur-3xl pointer-events-none" />

      <Sidebar />
      <div className="flex flex-1 flex-col pb-16 md:pb-0 z-10">
        <Navbar />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
