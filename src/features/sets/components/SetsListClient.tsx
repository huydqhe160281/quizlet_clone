'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { EmptyStatePanel } from '@/components/shared/EmptyStatePanel';
import { LoadMoreButton } from '@/components/shared/LoadMoreButton';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { SetCard } from '@/components/shared/SetCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AIGenerateModal, GenerateWithAIButton } from '@/features/sets/components/AIGenerateModal';
import { SetForm } from '@/features/sets/components/SetForm';
import { useSets } from '@/features/sets/hooks/useSets';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { useNavReselectRefetch } from '@/lib/navigation/use-nav-reselect-refetch';

export function SetsListClient() {
  const t = useTranslations();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
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
    <div className="flex flex-wrap gap-2">
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
      </>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('setsPage.title')}
        subtitle={t('setsPage.subtitle')}
        actions={toolbarActions}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set, index) => (
          <SetCard
            key={set.id}
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
      <AIGenerateModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
      {createDialog}
    </div>
  );
}
