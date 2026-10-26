'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Combine, Plus, Upload } from 'lucide-react';
import { EmptyStatePanel } from '@/components/shared/EmptyStatePanel';
import { LoadMoreButton } from '@/components/shared/LoadMoreButton';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { SetCard } from '@/components/shared/SetCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AIGenerateModal, GenerateWithAIButton } from '@/features/sets/components/AIGenerateModal';
import { MergeSetsDialog, type MergeCandidate } from '@/features/sets/components/MergeSetsDialog';
import { SetForm } from '@/features/sets/components/SetForm';
import { useSets } from '@/features/sets/hooks/useSets';
import { MIN_MERGE_SETS } from '@/features/sets/schemas/set.schema';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { useNavReselectRefetch } from '@/lib/navigation/use-nav-reselect-refetch';

export function SetsListClient() {
  const t = useTranslations();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  // null = normal browsing; an array = picking sets to merge, in click order.
  const [mergeSelection, setMergeSelection] = useState<MergeCandidate[] | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useSets();
  const sets = data?.pages.flatMap((page) => page.data) ?? [];

  useNavReselectRefetch('/sets', refetch);

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

  const toolbarActions = (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <GenerateWithAIButton
        onClick={() => setAiModalOpen(true)}
        className="col-span-2 order-last sm:order-none"
      />
      <Button asChild variant="outline" className="shadow-sm">
        <Link href="/sets/import">
          <Upload className="mr-1.5 sm:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t('setsPage.importSet')}</span>
          <span className="sm:hidden">{t('ui.import')}</span>
        </Link>
      </Button>
      {sets.length >= 2 && (
        <Button
          variant="outline"
          className="shadow-sm"
          aria-pressed={mergeSelection !== null}
          onClick={() => setMergeSelection((current) => (current === null ? [] : null))}
        >
          <Combine className="mr-1.5 sm:mr-2 h-4 w-4" />
          {t('setsPage.mergeSets')}
        </Button>
      )}
      <Button onClick={() => setCreateModalOpen(true)} className="order-first sm:order-none">
        <Plus className="mr-1.5 sm:mr-2 h-4 w-4" />
        <span className="hidden sm:inline">{t('setsPage.newSet')}</span>
        <span className="sm:hidden">{t('setsPage.new')}</span>
      </Button>
    </div>
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
      <div className="space-y-4">
        <PageHeader
          title={t('setsPage.title')}
          subtitle={t('setsPage.subtitle')}
          actions={toolbarActions}
        />
        <EmptyStatePanel
          variant="card"
          title={t('setsPage.emptyTitle')}
          description={t('setsPage.emptyHint')}
        />
        <AIGenerateModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
        {createDialog}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('setsPage.title')}
        subtitle={t('setsPage.subtitle')}
        actions={toolbarActions}
      />
      {mergeSelection !== null && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/30 bg-background/90 p-3 shadow-sm backdrop-blur">
          <p className="text-sm">
            {t('setsPage.mergeSelectHint', { count: mergeSelection.length })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setMergeSelection(null)}>
              {t('ui.cancel')}
            </Button>
            <Button
              size="sm"
              disabled={mergeSelection.length < MIN_MERGE_SETS}
              onClick={() => setMergeDialogOpen(true)}
            >
              {t('setsPage.mergeContinue', { count: mergeSelection.length })}
            </Button>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set, index) => (
          <SetCard
            key={set.id}
            selection={
              mergeSelection === null
                ? undefined
                : {
                    selected: mergeSelection.some((picked) => picked.id === set.id),
                    onToggle: () =>
                      setMergeSelection((current) =>
                        current?.some((picked) => picked.id === set.id)
                          ? current.filter((picked) => picked.id !== set.id)
                          : [
                              ...(current ?? []),
                              { id: set.id, title: set.title, cardCount: set._count.cards },
                            ]
                      ),
                  }
            }
            href={`/sets/${set.id}`}
            title={set.title}
            description={set.description}
            cardsCount={set._count.cards}
            visibility={set.visibility}
            showLayersIcon
            className="animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 fill-mode-both duration-500"
            style={{ animationDelay: `${Math.min(index, 8) * 75}ms` }}
          />
        ))}
      </div>
      <LoadMoreButton
        hasMore={hasNextPage ?? false}
        isLoading={isFetchingNextPage}
        onLoadMore={fetchNextPage}
        label={t('setsPage.loadMore')}
      />
      <MergeSetsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        initialSelection={mergeSelection ?? []}
      />
      <AIGenerateModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
      {createDialog}
    </div>
  );
}
