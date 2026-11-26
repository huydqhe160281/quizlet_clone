'use client';

import type { ReactNode } from 'react';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

/**
 * One placeholder shape. `bg-muted` keeps it readable in every theme while staying
 * lighter than real content, so the swap to the loaded page does not flash.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

/**
 * Card-shaped shell matching the app's glass panels. It skips the backdrop blur of
 * `glass-panel`: on a plain background it looks the same and costs nothing on phones.
 */
export function SkeletonPanel({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div aria-hidden className={cn('rounded-xl border border-border/50 bg-card/60', className)}>
      {children}
    </div>
  );
}

/**
 * Root of every loading placeholder: announces "loading" once to assistive tech and
 * keeps the shapes themselves out of the accessibility tree.
 */
export function SkeletonScreen({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations();
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      {children}
      {/* Last child: as the first one, `space-y-*` would push the shapes down. */}
      <span className="sr-only">{label ?? t('ui.loading')}</span>
    </div>
  );
}

/** Mirrors `PageHeader`: each bar sits in a box of the real text's line height. */
export function PageHeaderSkeleton({
  size = 'md',
  subtitle = true,
  className,
}: {
  size?: 'md' | 'lg';
  subtitle?: boolean;
  className?: string;
}) {
  const lg = size === 'lg';
  return (
    <div aria-hidden className={cn('flex flex-col gap-1', className)}>
      <div className={cn('flex items-center', lg ? 'h-9 sm:h-10' : 'h-8 sm:h-9')}>
        <Skeleton
          className={cn('rounded-lg', lg ? 'h-7 w-44 sm:h-8 sm:w-56' : 'h-6 w-40 sm:h-7 sm:w-48')}
        />
      </div>
      {subtitle && (
        <div className={cn('flex items-center', lg ? 'h-6 sm:h-7' : 'h-5 sm:h-6')}>
          <Skeleton className={cn('max-w-full', lg ? 'h-4 w-64 sm:w-80' : 'h-3.5 w-56 sm:w-72')} />
        </div>
      )}
    </div>
  );
}

/** Mirrors `SetCard` (title, two description lines, badges). */
export function SetCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex flex-col rounded-2xl border border-border/50 bg-card/60 p-4 sm:min-h-[11.5rem] sm:p-5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:min-h-[3.5rem]">
        <div className="flex h-6 flex-1 items-center sm:h-7">
          <Skeleton className="h-4 w-3/4 sm:h-5" />
        </div>
        <Skeleton className="h-5 w-5 shrink-0" />
      </div>
      <div className="mt-1 space-y-1.5 py-1 sm:min-h-[2.5rem]">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="mt-auto flex gap-2 pt-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

/** The set grid used by My Sets, Search and Library. Phones get three tiles, not six. */
export function SetCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-hidden className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <SetCardSkeleton key={index} className={index >= 3 ? 'max-sm:hidden' : undefined} />
      ))}
    </div>
  );
}
