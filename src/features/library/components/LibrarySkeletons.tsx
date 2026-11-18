'use client';

import {
  PageHeaderSkeleton,
  SetCardGridSkeleton,
  Skeleton,
  SkeletonPanel,
  SkeletonScreen,
} from '@/components/shared/Skeleton';

/** Mirrors `LibraryPageClient`: header, the three sort chips, then the set grid. */
export function LibrarySkeleton() {
  return (
    <SkeletonScreen className="space-y-6">
      <PageHeaderSkeleton />
      <div aria-hidden className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
      <SetCardGridSkeleton />
    </SkeletonScreen>
  );
}

/** Mirrors `SharedSetPreview`: title block, duplicate button, then the card rows. */
export function SharedSetSkeleton() {
  return (
    <SkeletonScreen className="space-y-6">
      <div aria-hidden className="min-w-0">
        <div className="flex h-8 items-center sm:h-9">
          <Skeleton className="h-6 w-3/4 rounded-lg sm:h-7 sm:w-96" />
        </div>
        <div className="mt-2 flex h-6 items-center">
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-[22px] w-16 rounded-full" />
          <Skeleton className="h-[22px] w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-11 w-44 rounded-lg" />
      <SkeletonPanel className="overflow-hidden rounded-2xl">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid gap-2 border-b border-border/50 p-4 last:border-b-0 sm:grid-cols-2"
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </SkeletonPanel>
    </SkeletonScreen>
  );
}
