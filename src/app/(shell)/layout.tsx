import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileNav, MobileNavSpacer } from '@/components/layout/MobileNav';

/**
 * App chrome shared by the signed-in `(app)` pages and the `(public)` library pages.
 * Living in one layout keeps the sidebar and navbar mounted when navigating between
 * the two groups (e.g. Dashboard ↔ Library) instead of remounting the whole shell.
 * Each group's layout renders its own `<main>`.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh relative overflow-clip">
      {/* Ambient background blobs: desktop only — two 1000px blurs cost frames on phones. */}
      <div className="decor-glow max-md:hidden fixed -top-[500px] -right-[500px] h-[1000px] w-[1000px] rounded-full bg-primary/5 opacity-50 blur-3xl pointer-events-none" />
      <div className="decor-glow max-md:hidden fixed -bottom-[500px] -left-[500px] h-[1000px] w-[1000px] rounded-full bg-primary/5 opacity-50 blur-3xl pointer-events-none" />

      <Sidebar />
      <div className="flex flex-1 flex-col z-10 min-w-0">
        <Navbar />
        {children}
        <MobileNavSpacer />
      </div>
      <MobileNav />
    </div>
  );
}
