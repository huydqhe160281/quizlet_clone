'use client';

import Link from 'next/link';
import { Check, Layers } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type SetCardProps = {
  href: string;
  title: string;
  description: string | null;
  cardsCount?: number;
  studiedCount?: number;
  language?: string | null;
  visibility?: 'PUBLIC' | 'PRIVATE';
  showLayersIcon?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Turns the card into a toggle button (e.g. picking sets to merge) instead of a link. */
  selection?: { selected: boolean; onToggle: () => void };
};

export function SetCard({
  href,
  title,
  description,
  cardsCount,
  studiedCount,
  language,
  visibility,
  showLayersIcon = false,
  className,
  style,
  selection,
}: SetCardProps) {
  const t = useTranslations();
  const tileClassName = `group relative block h-full w-full overflow-hidden text-left sm:min-h-[11.5rem] rounded-2xl border border-border/50 bg-card/60 p-4 sm:p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md ${selection?.selected ? 'border-primary ring-2 ring-primary/40' : ''} ${className ?? ''}`;

  const content = (
    <>
      <div className="decor-glow pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
      <div className="relative z-10 flex h-full min-w-0 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 break-words sm:min-h-[3.5rem] text-base font-semibold transition-colors group-hover:text-primary sm:text-lg">
            {title}
          </h3>
          {selection ? (
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-primary/50 ${selection.selected ? 'bg-primary text-primary-foreground' : ''}`}
            >
              {selection.selected && <Check className="h-4 w-4" />}
            </span>
          ) : (
            showLayersIcon && (
              <Layers className="h-5 w-5 shrink-0 text-primary/70 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110" />
            )
          )}
        </div>
        <p className="mt-1 line-clamp-2 break-words sm:min-h-[2.5rem] text-sm text-muted-foreground">
          {description ?? t('ui.noDescription')}
        </p>
        <div className="mt-auto flex min-h-7 flex-wrap gap-2 pt-3">
          {typeof cardsCount === 'number' && (
            <Badge
              variant="secondary"
              className="transition-colors group-hover:bg-primary/10 group-hover:text-primary"
            >
              {t('ui.cardsCount', { count: cardsCount })}
            </Badge>
          )}
          {typeof studiedCount === 'number' && (
            <Badge variant="outline">{t('ui.studiedCount', { count: studiedCount })}</Badge>
          )}
          {visibility && (
            <Badge variant="outline">
              {visibility === 'PUBLIC' ? t('ui.public') : t('ui.private')}
            </Badge>
          )}
          {language && <Badge variant="outline">{language}</Badge>}
        </div>
      </div>
    </>
  );

  if (selection) {
    return (
      <button
        type="button"
        data-slot="tile"
        aria-pressed={selection.selected}
        onClick={selection.onToggle}
        className={tileClassName}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href} data-slot="tile" className={tileClassName} style={style}>
      {content}
    </Link>
  );
}
