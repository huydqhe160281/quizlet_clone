'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAV_ITEMS } from '@/lib/navigation/navigation-data';
import { dispatchNavReselect } from '@/lib/navigation/nav-reselect';
import { NAV_ICON_MAP } from '@/lib/navigation/navigation-icons';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 sm:hidden pb-[env(safe-area-inset-bottom)] p-3 pointer-events-none">
      <div className="flex w-full justify-around rounded-2xl glass-panel p-2 shadow-2xl border-white/20 pointer-events-auto">
        {APP_NAV_ITEMS.map(({ href, mobileLabelKey, icon, guideTargetId }) => {
          const Icon = NAV_ICON_MAP[icon];
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const reselectable = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              data-guide={guideTargetId}
              onClick={(event) => {
                if (reselectable) {
                  event.preventDefault();
                  dispatchNavReselect(href);
                }
              }}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-semibold transition-all duration-300',
                active
                  ? 'text-primary bg-primary/10 shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'relative transition-transform duration-300',
                  active && '-translate-y-1'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'text-primary')} />
              </div>
              <span className={cn('transition-all duration-300', active && '-translate-y-0.5')}>
                {t(mobileLabelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
