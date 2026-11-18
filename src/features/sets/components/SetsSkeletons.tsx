'use client';

import {
  PageHeaderSkeleton,
  SetCardGridSkeleton,
  Skeleton,
  SkeletonPanel,
  SkeletonScreen,
} from '@/components/shared/Skeleton';
import { StudyModesSkeleton } from '@/features/study/components/shared/StudySkeletons';

/** Mirrors `SetsListClient`: header with the toolbar, then the set grid. */
export function SetsListSkeleton({ label }: { label?: string }) {
  return (
    <SkeletonScreen label={label} className="space-y-4">
      <div
        aria-hidden
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <PageHeaderSkeleton />
        {/* Same grid as the toolbar: New, Import, Merge (shown from two sets up), then
            "Generate with AI" full width on phones. */}
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Skeleton className="order-last col-span-2 h-11 rounded-lg sm:order-none sm:w-44" />
          <Skeleton className="h-11 rounded-lg sm:w-32" />
          <Skeleton className="h-11 rounded-lg sm:w-32" />
          <Skeleton className="order-first h-11 rounded-lg sm:order-none sm:w-28" />
        </div>
      </div>
      <SetCardGridSkeleton />
    </SkeletonScreen>
  );
}

/** Mirrors `CardEditor`: the add-card panel and the first rows of the card list. */
export function CardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className="space-y-6">
      <SkeletonPanel className="space-y-3 p-4">
        <div className="flex h-6 items-center">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg sm:w-28" />
        </div>
      </SkeletonPanel>
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <SkeletonPanel key={index} className="grid gap-2 p-4 sm:grid-cols-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </SkeletonPanel>
        ))}
      </div>
    </div>
  );
}

/** Mirrors `SetDetailClient`: back link, title block, actions, study modes, cards. */
export function SetDetailSkeleton({ label }: { label?: string }) {
  return (
    <SkeletonScreen label={label} className="space-y-6">
      <div aria-hidden className="-mb-2">
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div aria-hidden className="flex flex-wrap items-start justify-between gap-4">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <div className="flex h-8 items-center sm:h-9">
            <Skeleton className="h-6 w-3/4 rounded-lg sm:h-7 sm:w-96" />
          </div>
          <div className="mt-1 space-y-2 py-1">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-2/3 max-w-xs" />
          </div>
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-[22px] w-16 rounded-full" />
            <Skeleton className="h-[22px] w-14 rounded-full" />
          </div>
        </div>
        {/* Icon-only buttons on phones, labelled ones from `sm` up; delete sits last. */}
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-11 sm:w-24" />
          ))}
          <Skeleton className="h-9 w-11 sm:w-20" />
        </div>
      </div>
      <StudyModesSkeleton />
      <CardListSkeleton />
    </SkeletonScreen>
  );
}

/** Mirrors the full-page `SetForm` card (new / edit set). */
export function SetFormSkeleton() {
  return (
    <SkeletonScreen>
      <SkeletonPanel className="rounded-2xl">
        <div className="space-y-2 p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 w-28 rounded-lg" />
            <Skeleton className="h-11 w-24 rounded-lg" />
          </div>
        </div>
      </SkeletonPanel>
    </SkeletonScreen>
  );
}

/** Mirrors the import page: back link, then the wizard card with its JSON box. */
export function ImportSetSkeleton() {
  return (
    <SkeletonScreen className="mx-auto max-w-2xl">
      <div aria-hidden className="mb-4">
        <Skeleton className="h-9 w-32" />
      </div>
      <SkeletonPanel className="rounded-2xl">
        <div className="space-y-2 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="space-y-4 px-6 pb-6">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </SkeletonPanel>
    </SkeletonScreen>
  );
}
