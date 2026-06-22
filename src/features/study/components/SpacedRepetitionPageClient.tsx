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
      <div>
        <h1 className="text-2xl font-bold">Spaced repetition</h1>
        <p className="text-muted-foreground">Review cards due today using SM-2.</p>
      </div>
      <SpacedRepetitionStudy />
    </div>
  );
}
