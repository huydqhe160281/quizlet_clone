'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Home, Layers, Library, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/sets', label: 'My Sets', icon: Layers },
  { href: '/study', label: 'Study', icon: Sparkles },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-panel hidden w-64 shrink-0 border-r md:flex md:flex-col sticky top-0 h-screen z-30">
      <div className="flex h-16 items-center gap-2 border-b border-border/50 px-6">
        <BookOpen className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
          Flashcards
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all hover:pl-4',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-transform group-hover:scale-110',
                  active && 'scale-110 text-primary'
                )}
              />
              {label}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
