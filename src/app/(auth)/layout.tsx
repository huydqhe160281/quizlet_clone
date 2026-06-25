import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { createNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = createNoIndexMetadata();

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="relative z-10 flex w-full max-w-5xl justify-between items-center mx-auto mb-12">
        <Link
          href="/"
          className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-2xl font-bold tracking-tight text-transparent"
        >
          Flashcards
        </Link>
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col justify-center">
        {children}
      </div>
    </div>
  );
}
