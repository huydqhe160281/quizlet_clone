'use client';

import {
  PageHeaderSkeleton,
  Skeleton,
  SkeletonPanel,
  SkeletonScreen,
} from '@/components/shared/Skeleton';

const STAT_TILES = 8;
const RECENT_ROWS = 3;

/** Mirrors `ActivityHeatmap`: also its own placeholder while the chunk loads. */
export function ActivityHeatmapSkeleton() {
  return (
    <SkeletonPanel className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-7 items-center">
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-[110px] w-full rounded-lg" />
      <div className="mt-3 flex h-5 items-center">
        <Skeleton className="h-3.5 w-52 max-w-full" />
      </div>
    </SkeletonPanel>
  );
}

/** Mirrors `DashboardClient`: header, stat grid, heatmap, recent sessions. */
export function DashboardSkeleton() {
  return (
    <SkeletonScreen className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeaderSkeleton size="lg" />

      <div aria-hidden className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: STAT_TILES }, (_, index) => (
          <SkeletonPanel key={index} className="p-4 sm:p-5">
            <div className="flex h-5 items-center gap-2">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <div className="mt-3 flex h-9 items-center">
              <Skeleton className="h-7 w-14" />
            </div>
          </SkeletonPanel>
        ))}
      </div>

      <ActivityHeatmapSkeleton />

      <SkeletonPanel className="p-5">
        <div className="mb-4 flex h-7 items-center">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: RECENT_ROWS }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-5 w-12 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </SkeletonPanel>
    </SkeletonScreen>
  );
}
