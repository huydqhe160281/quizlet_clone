'use client';

import {
  PageHeaderSkeleton,
  SetCardGridSkeleton,
  Skeleton,
  SkeletonScreen,
} from '@/components/shared/Skeleton';

/** Mirrors `SearchPageClient`: header, search bar, result hint, then the set grid. */
export function SearchSkeleton() {
  return (
    <SkeletonScreen className="space-y-6">
      <PageHeaderSkeleton />
      <div aria-hidden className="flex gap-2">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 w-20 rounded-lg" />
      </div>
      <div aria-hidden className="flex h-5 items-center">
        <Skeleton className="h-3.5 w-56 max-w-full" />
      </div>
      <SetCardGridSkeleton />
    </SkeletonScreen>
  );
}
