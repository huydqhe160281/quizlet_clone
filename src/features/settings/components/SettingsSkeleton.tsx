'use client';

import { Skeleton, SkeletonPanel, SkeletonScreen } from '@/components/shared/Skeleton';

function SectionHeader() {
  return (
    <div className="mb-4 flex items-start gap-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>
    </div>
  );
}

/** Mirrors `SettingsPageClient`: header, the theme picker section, the study section. */
export function SettingsSkeleton() {
  return (
    <SkeletonScreen className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
      <div aria-hidden className="space-y-1">
        <div className="flex h-8 items-center sm:h-9">
          <Skeleton className="h-6 w-32 rounded-lg sm:h-7" />
        </div>
        <div className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-64 max-w-full" />
        </div>
      </div>

      <SkeletonPanel className="p-4 sm:p-6">
        <SectionHeader />
        {/* Outlined tiles with a faint preview, like the theme cards, instead of solid
            blocks that read much heavier than the real picker. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="flex h-[7.5rem] flex-col justify-between rounded-xl border border-border/60 p-3"
            >
              <div className="space-y-2">
                <Skeleton className="h-2 w-1/2" />
                <Skeleton className="h-6 w-full rounded-lg" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </SkeletonPanel>

      <SkeletonPanel className="p-4 sm:p-6">
        <SectionHeader />
        <div className="space-y-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </SkeletonPanel>
    </SkeletonScreen>
  );
}
