'use client';

import {
  PageHeaderSkeleton,
  Skeleton,
  SkeletonPanel,
  SkeletonScreen,
} from '@/components/shared/Skeleton';

const MODE_TILES = 6;

/** Mirrors `StudyLauncher`: the "Choose a study method" header and the mode tiles. */
export function StudyModesSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-7 items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-44" />
        </div>
        <Skeleton className="h-9 w-11 rounded-xl sm:w-44" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {Array.from({ length: MODE_TILES }, (_, index) => (
          <SkeletonPanel
            key={index}
            className="flex items-center gap-3 p-3.5 sm:items-start sm:gap-4 sm:p-5"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl sm:h-[52px] sm:w-[52px]" />
            <div className="min-w-0 flex-1 space-y-2 py-0.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="hidden h-3 w-2/3 sm:block" />
            </div>
          </SkeletonPanel>
        ))}
      </div>
    </div>
  );
}

export type StudySessionSkeletonVariant = 'flashcard' | 'quiz' | 'write' | 'draw' | 'gravity';

function QuestionPanel() {
  return (
    <SkeletonPanel className="flex min-h-40 flex-col justify-center gap-4 rounded-2xl p-6">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-7 w-2/3" />
    </SkeletonPanel>
  );
}

function AnswerInputRow() {
  return (
    <div className="flex gap-2">
      <Skeleton className="h-12 flex-1 rounded-xl" />
      <Skeleton className="h-12 w-24 rounded-xl" />
    </div>
  );
}

function SessionBody({ variant }: { variant: StudySessionSkeletonVariant }) {
  switch (variant) {
    case 'flashcard':
      return (
        <>
          <SkeletonPanel className="flex flex-wrap items-center gap-2 rounded-2xl p-4">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </SkeletonPanel>
          <SkeletonPanel className="mx-auto flex h-72 w-full max-w-2xl flex-col justify-between rounded-2xl p-6 md:h-80">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mx-auto h-8 w-1/3" />
            <Skeleton className="h-3 w-40" />
          </SkeletonPanel>
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <Skeleton className="h-12 flex-1 rounded-full sm:max-w-48" />
            <Skeleton className="h-8 w-14 rounded-full" />
            <Skeleton className="h-12 flex-1 rounded-full sm:max-w-48" />
          </div>
        </>
      );
    case 'quiz':
      return (
        <>
          <QuestionPanel />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        </>
      );
    case 'write':
      return (
        <>
          <QuestionPanel />
          <AnswerInputRow />
        </>
      );
    case 'draw':
      return (
        <>
          <QuestionPanel />
          <SkeletonPanel className="mx-auto aspect-square w-full max-w-xs rounded-2xl" />
          <div className="flex justify-center gap-2">
            <Skeleton className="h-11 w-28 rounded-lg" />
            <Skeleton className="h-11 w-28 rounded-lg" />
          </div>
        </>
      );
    case 'gravity':
      return (
        <>
          <SkeletonPanel className="h-80 rounded-2xl md:h-96" />
          <AnswerInputRow />
        </>
      );
  }
}

/**
 * Mirrors `StudyModeShell` (exit button, mode label, round badge, progress bar) with a
 * body shaped like the mode. The route `loading.tsx`, the mode's code-split chunk and
 * the session fetch all render it, so starting a session is one continuous placeholder.
 */
export function StudySessionSkeleton({
  variant,
  label,
}: {
  variant: StudySessionSkeletonVariant;
  label?: string;
}) {
  return (
    <SkeletonScreen label={label} className="mx-auto max-w-4xl space-y-6 px-1 py-2">
      <div aria-hidden className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div aria-hidden className="w-full space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div aria-hidden className="space-y-6">
        <SessionBody variant={variant} />
      </div>
    </SkeletonScreen>
  );
}

/** Mirrors the spaced-repetition settings card shown before a review starts. */
export function SpacedRepetitionFormSkeleton() {
  return (
    <SkeletonPanel className="space-y-6 rounded-2xl p-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-56" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </SkeletonPanel>
  );
}

/** Mirrors `SpacedRepetitionPageClient` for the `/study` route. */
export function SpacedRepetitionSkeleton({ label }: { label?: string }) {
  return (
    <SkeletonScreen label={label} className="space-y-6">
      <PageHeaderSkeleton />
      <SpacedRepetitionFormSkeleton />
    </SkeletonScreen>
  );
}
