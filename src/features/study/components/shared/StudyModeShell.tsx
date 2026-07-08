'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudyProgress } from '@/features/study/components/shared/StudyProgress';
import { cn } from '@/lib/utils';

type StudyModeShellProps = {
  setId: string;
  modeLabel: string;
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
  badge?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function StudyModeShell({
  setId,
  modeLabel,
  progress,
  badge,
  className,
  children,
}: StudyModeShellProps) {
  return (
    <div className={cn('mx-auto max-w-4xl space-y-6 px-1 py-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild className="rounded-xl shadow-sm">
          <Link href={`/sets/${setId}`} className="gap-1.5 font-semibold">
            <ArrowLeft className="h-4 w-4" />
            Thoát học
          </Link>
        </Button>
        <p className="text-sm font-bold text-muted-foreground">{modeLabel}</p>
        {badge}
      </div>

      {progress && (
        <StudyProgress
          current={progress.current}
          total={progress.total}
          label={progress.label}
          fullWidth
        />
      )}

      {children}
    </div>
  );
}
