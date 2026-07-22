'use client';

import Link from 'next/link';
import { Layers } from 'lucide-react';
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
}: SetCardProps) {
  const t = useTranslations();

  return (
    <Link
      href={href}
      className={`group relative block h-full min-h-[11.5rem] overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-4 sm:p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md ${className ?? ''}`}
      style={style}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
      <div className="relative z-10 flex h-full min-w-0 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 min-h-[3.5rem] break-words text-base font-semibold transition-colors group-hover:text-primary sm:text-lg">
            {title}
          </h3>
          {showLayersIcon && (
            <Layers className="h-5 w-5 shrink-0 text-primary/70 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110" />
          )}
        </div>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] break-words text-sm text-muted-foreground">
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
    </Link>
  );
}
