'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type SharedSetPreviewProps = {
  set: {
    id: string;
    title: string;
    description: string | null;
    language: string | null;
    user: { name: string | null };
    _count: { cards: number; studySessions: number };
    cards: Array<{ front: string; back: string }>;
  };
};

export function SharedSetPreview({ set }: SharedSetPreviewProps) {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duplicate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/sets/${set.id}/duplicate`, { method: 'POST' });
      if (!response.ok) {
        if (response.status === 401) {
          setError(t('shared.signInToDuplicate'));
          return;
        }
        setError(t('shared.duplicateFailed'));
        return;
      }
      const payload = (await response.json()) as { data: { id: string } };
      router.push(`/sets/${payload.data.id}`);
    } catch {
      setError(t('shared.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {set.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{set.description ?? t('ui.noDescription')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">{t('ui.cardsCount', { count: set._count.cards })}</Badge>
          {set.language && <Badge variant="outline">{set.language}</Badge>}
          {set.user.name && (
            <Badge variant="outline">{t('shared.byAuthor', { name: set.user.name })}</Badge>
          )}
        </div>
      </div>
      {error && (
        <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void duplicate()}>
            {t('ui.retry')}
          </Button>
        </div>
      )}
      <Button onClick={() => void duplicate()} disabled={loading}>
        {loading ? t('shared.duplicating') : t('shared.duplicateToMySets')}
      </Button>
      <div className="glass-panel overflow-hidden rounded-2xl border-border/50 shadow-sm">
        {set.cards.map((card) => (
          <div
            key={`${card.front}-${card.back}`}
            className="grid gap-2 border-b p-4 last:border-b-0 sm:grid-cols-2"
          >
            <p>{card.front}</p>
            <p className="text-muted-foreground">{card.back}</p>
          </div>
        ))}
      </div>
      <Link href="/library" className="text-sm text-primary hover:underline">
        {t('shared.backToLibrary')}
      </Link>
    </div>
  );
}
