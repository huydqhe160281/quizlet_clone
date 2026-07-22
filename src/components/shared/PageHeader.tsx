'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  size?: 'md' | 'lg';
  className?: string;
};

export function PageHeader({ title, subtitle, actions, size = 'md', className }: PageHeaderProps) {
  const titleClass =
    size === 'lg' ? 'text-3xl sm:text-4xl font-extrabold' : 'text-2xl sm:text-3xl font-bold';
  const subtitleClass = size === 'lg' ? 'text-base sm:text-lg font-medium' : 'text-sm sm:text-base';

  if (actions) {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
          className
        )}
      >
        <div className="flex flex-col gap-1">
          <h1
            className={cn(
              'bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text tracking-tight text-transparent',
              titleClass
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className={cn('text-muted-foreground', subtitleClass)}>{subtitle}</p>
          ) : null}
        </div>
        <div className="shrink-0">{actions}</div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <h1
        className={cn(
          'bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text tracking-tight text-transparent',
          titleClass
        )}
      >
        {title}
      </h1>
      {subtitle ? <p className={cn('text-muted-foreground', subtitleClass)}>{subtitle}</p> : null}
    </div>
  );
}
