'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ArrowLeft, Copy, Pencil, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RedirectingNotice } from '@/components/shared/RedirectingNotice';
import { CardEditor } from '@/features/sets/cards/components/CardEditor';
import { StudyLauncher } from '@/features/study/components/StudyLauncher';
import { useSet, useSetMutations, useCards } from '@/features/sets/hooks/useSets';
import { ImportSetWizard } from '@/features/sets/components/ImportSetWizard';
import { SetForm } from '@/features/sets/components/SetForm';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type SetDetailClientProps = {
  setId: string;
};

export function SetDetailClient({ setId }: SetDetailClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { data: set, isLoading, error: setError } = useSet(setId);
  const { data: cards, error: cardsError } = useCards(setId);
  const { deleteSet, duplicateSet } = useSetMutations();
  const loadError = setError ?? cardsError;
  const newWordCount = cards?.filter((card) => card.type === 'new-word').length ?? 0;

  if (loadError) {
    return (
      <RedirectingNotice error={loadError} fallbackHref="/sets" message={t('setsPage.notFound')} />
    );
  }

  if (isLoading || !set) {
    return (
      <div className="glass-panel animate-pulse rounded-2xl p-8 text-sm text-muted-foreground">
        {t('setsPage.loadingSet')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="-mb-2">
        <Button variant="ghost" size="sm" asChild className="-ml-3 rounded-full">
          <Link
            href="/sets"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('setsPage.backToSets')}
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {set.title}
          </h1>
          <p className="mt-1 text-muted-foreground">{set.description ?? t('ui.noDescription')}</p>
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">{t('ui.cardsCount', { count: set._count.cards })}</Badge>
            <Badge variant="outline">
              {set.visibility === 'PUBLIC' ? t('ui.public') : t('ui.private')}
            </Badge>
            {set.language && <Badge variant="outline">{set.language}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="gap-1.5"
            aria-label={t('ui.edit')}
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">{t('ui.edit')}</span>
          </Button>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('setsPage.editSet')}</DialogTitle>
              </DialogHeader>
              <SetForm
                mode="edit"
                setId={setId}
                initial={{
                  title: set.title,
                  description: set.description,
                  language: set.language,
                  visibility: set.visibility,
                }}
                isModal
                onSuccess={() => setEditOpen(false)}
                onCancel={() => setEditOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" aria-label={t('ui.import')}>
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">{t('ui.import')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[620px] flex flex-col max-h-[90vh] overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                <ImportSetWizard
                  setId={setId}
                  variant="embedded"
                  onSuccess={() => {
                    setImportOpen(false);
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            aria-label={t('ui.duplicate')}
            onClick={() =>
              duplicateSet.mutate(setId, {
                onSuccess: (result) => router.push(`/sets/${result.data.id}`),
              })
            }
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">{t('ui.duplicate')}</span>
          </Button>
          {/* Visually separated destructive action */}
          <div className="ml-auto sm:ml-0">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              aria-label={t('ui.delete')}
              onClick={() => {
                if (window.confirm(t('setsPage.deleteConfirm'))) {
                  deleteSet.mutate(setId, { onSuccess: () => router.push('/sets') });
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('ui.delete')}</span>
            </Button>
          </div>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="glass-panel animate-pulse rounded-2xl p-8 text-sm text-muted-foreground">
            {t('setsPage.loadingModes')}
          </div>
        }
      >
        <StudyLauncher setId={setId} cardCount={set._count.cards} newWordCount={newWordCount} />
      </Suspense>
      <CardEditor setId={setId} />
    </div>
  );
}
