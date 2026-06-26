'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAV_ITEMS } from '@/lib/navigation/navigation-data';
import { NAV_ICON_MAP } from '@/lib/navigation/navigation-icons';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-nav fixed bottom-0 left-0 right-0 z-50 border-t md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {APP_NAV_ITEMS.map(({ href, mobileLabel, icon, guideTargetId }) => {
          const Icon = NAV_ICON_MAP[icon];
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              data-guide={guideTargetId}
              className={cn(
                'flex flex-col items-center gap-1 py-2 text-xs transition-colors',
                active ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform', active && 'scale-110')} />
              <span>{mobileLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
