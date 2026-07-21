'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { APP_NAV_ITEMS } from '@/lib/navigation/navigation-data';
import { NAV_ICON_MAP } from '@/lib/navigation/navigation-icons';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <aside className="glass-panel hidden w-64 shrink-0 border-r border-r-border/50 md:flex md:flex-col sticky top-0 h-screen z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      <div className="flex h-20 items-center gap-3 border-b border-border/50 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
          <BookOpen className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-extrabold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {t('app.name')}
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {APP_NAV_ITEMS.map(({ href, labelKey, icon, guideTargetId }) => {
          const Icon = NAV_ICON_MAP[icon];
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              data-guide={guideTargetId}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300',
                active
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 translate-x-1'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-1'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3',
                  active && 'scale-110 text-primary-foreground'
                )}
              />
              {t(labelKey)}
              {active && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
