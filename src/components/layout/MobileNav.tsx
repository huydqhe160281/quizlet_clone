'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, Library, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/sets', label: 'Sets', icon: Layers },
  { href: '/study', label: 'Study', icon: Sparkles },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Library },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-nav fixed bottom-0 left-0 right-0 z-50 border-t md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 py-2 text-xs transition-colors',
                active ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform', active && 'scale-110')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
