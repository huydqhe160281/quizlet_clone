'use client';

import dynamic from 'next/dynamic';

const SpacedRepetitionStudy = dynamic(
  () =>
    import('@/features/study/components/SpacedRepetitionStudy').then(
      (m) => m.SpacedRepetitionStudy
    ),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted-foreground">Loading study session…</p>,
  }
);

export function SpacedRepetitionPageClient() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Spaced repetition
        </h1>
        <p className="text-muted-foreground">Review cards due today using SM-2.</p>
      </div>
      <SpacedRepetitionStudy />
    </div>
  );
}
