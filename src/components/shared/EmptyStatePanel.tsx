'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStatePanelProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: 'panel' | 'card';
  className?: string;
};

export function EmptyStatePanel({
  title,
  description,
  action,
  variant = 'panel',
  className,
}: EmptyStatePanelProps) {
  return (
    <div
      className={cn(
        variant === 'card'
          ? 'glass-panel overflow-hidden rounded-2xl border border-border/50 p-6 text-sm text-muted-foreground'
          : 'rounded-xl border border-border/50 bg-muted/20 p-6 text-sm text-muted-foreground',
        className
      )}
    >
      <p className="font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
