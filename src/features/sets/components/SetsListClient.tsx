'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AIGenerateModal, GenerateWithAIButton } from '@/features/sets/components/AIGenerateModal';
import { SetForm } from '@/features/sets/components/SetForm';
import { useSets } from '@/features/sets/hooks/useSets';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

export function SetsListClient() {
  const t = useTranslations();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useSets();
  const sets = data?.pages.flatMap((page) => page.data) ?? [];

  const createDialog = (
    <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('setsPage.createTitle')}</DialogTitle>
        </DialogHeader>
        <SetForm
          mode="create"
          isModal
          onSuccess={() => setCreateModalOpen(false)}
          onCancel={() => setCreateModalOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div className="glass-panel animate-pulse rounded-2xl p-8 text-sm text-muted-foreground">
        {t('setsPage.loading')}
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <>
        <Card className="glass-panel overflow-hidden rounded-2xl">
          <CardHeader>
            <CardTitle>{t('setsPage.emptyTitle')}</CardTitle>
            <CardDescription>{t('setsPage.emptyHint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <GenerateWithAIButton onClick={() => setAiModalOpen(true)} />
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('setsPage.createSet')}
            </Button>
            <Button asChild variant="outline">
              <Link href="/sets/import">
                <Upload className="mr-2 h-4 w-4" />
                {t('setsPage.importSet')}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <AIGenerateModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
        {createDialog}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t('setsPage.title')}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">{t('setsPage.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <GenerateWithAIButton onClick={() => setAiModalOpen(true)} />
          <Button asChild variant="outline" className="shadow-sm">
            <Link href="/sets/import">
              <Upload className="mr-1.5 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('setsPage.importSet')}</span>
              <span className="sm:hidden">{t('ui.import')}</span>
            </Link>
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-1.5 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('setsPage.newSet')}</span>
            <span className="sm:hidden">{t('setsPage.new')}</span>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set, index) => (
          <Link
            key={set.id}
            href={`/sets/${set.id}`}
            className="animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 fill-mode-both"
            style={{ animationDelay: `${Math.min(index, 8) * 75}ms` }}
          >
            <Card className="glass-panel h-full relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 group">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all duration-500 group-hover:bg-primary/10 group-hover:scale-150" />
              <CardHeader className="relative z-10">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                    {set.title}
                  </CardTitle>
                  <Layers className="h-5 w-5 shrink-0 text-primary/70 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" />
                </div>
                <CardDescription className="line-clamp-2">
                  {set.description ?? t('ui.noDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-secondary/50 backdrop-blur-sm">
                  {t('ui.cardsCount', { count: set._count.cards })}
                </Badge>
                <Badge variant="outline" className="bg-background/30 backdrop-blur-sm">
                  {set.visibility === 'PUBLIC' ? t('ui.public') : t('ui.private')}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {hasNextPage && (
        <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? t('ui.loading') : t('setsPage.loadMore')}
        </Button>
      )}
      <AIGenerateModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
      {createDialog}
    </div>
  );
}
