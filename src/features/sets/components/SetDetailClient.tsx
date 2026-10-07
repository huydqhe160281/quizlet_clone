'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ArrowLeft, Copy, Pencil, Scissors, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RedirectingNotice } from '@/components/shared/RedirectingNotice';
import { CardEditor } from '@/features/sets/cards/components/CardEditor';
import { StudyLauncher } from '@/features/study/components/StudyLauncher';
import { useSet, useSetMutations, useCards } from '@/features/sets/hooks/useSets';
import { ImportSetWizard } from '@/features/sets/components/ImportSetWizard';
import { SetForm } from '@/features/sets/components/SetForm';
import { MAX_SPLIT_PARTS } from '@/features/sets/schemas/set.schema';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type SetDetailClientProps = {
  setId: string;
};

const DEFAULT_CHUNK_SIZE = 20;

function defaultChunkSizeFor(cardCount: number): number {
  if (cardCount < 2) {
    return 1;
  }
  return Math.min(DEFAULT_CHUNK_SIZE, cardCount - 1);
}

export function SetDetailClient({ setId }: SetDetailClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [chunkSizeInput, setChunkSizeInput] = useState(String(DEFAULT_CHUNK_SIZE));
  const [splitError, setSplitError] = useState<string | null>(null);
  const { data: set, isLoading, error: setError } = useSet(setId);
  const { data: cards, error: cardsError } = useCards(setId);
  const { deleteSet, duplicateSet, splitSet } = useSetMutations();
  const loadError = setError ?? cardsError;
  const newWordCount = cards?.filter((card) => card.type === 'new-word').length ?? 0;
  const cardCount = set?._count.cards ?? 0;

  const chunkSize =
    /^\d+$/.test(chunkSizeInput.trim()) && Number.isInteger(Number(chunkSizeInput))
      ? Number(chunkSizeInput)
      : NaN;
  const splitPreview =
    Number.isInteger(chunkSize) && chunkSize >= 1 && chunkSize < cardCount
      ? Math.ceil(cardCount / chunkSize)
      : null;
  const exceedsPartCap = splitPreview !== null && splitPreview > MAX_SPLIT_PARTS;
  const maxChunkSize = Math.max(cardCount - 1, 0);
  const canSubmitSplit =
    cardCount > 1 &&
    Number.isInteger(chunkSize) &&
    chunkSize >= 1 &&
    chunkSize < cardCount &&
    !exceedsPartCap &&
    !splitSet.isPending;

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
          <Dialog
            open={splitOpen}
            onOpenChange={(open) => {
              setSplitOpen(open);
              if (open) {
                setChunkSizeInput(String(defaultChunkSizeFor(cardCount)));
                setSplitError(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" aria-label={t('ui.split')}>
                <Scissors className="h-4 w-4" />
                <span className="hidden sm:inline">{t('ui.split')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>{t('setsPage.splitTitle')}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{t('setsPage.splitHint')}</p>
              {cardCount === 0 ? (
                <p className="text-sm text-destructive">{t('setsPage.splitEmpty')}</p>
              ) : cardCount < 2 ? (
                <p className="text-sm text-destructive">{t('setsPage.splitTooFew')}</p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="split-chunk-size">{t('setsPage.splitChunkSize')}</Label>
                    <Input
                      id="split-chunk-size"
                      type="number"
                      min={1}
                      max={maxChunkSize || 1}
                      value={chunkSizeInput}
                      onChange={(event) => {
                        setChunkSizeInput(event.target.value);
                        setSplitError(null);
                      }}
                    />
                  </div>
                  {splitPreview !== null && !exceedsPartCap ? (
                    <p className="text-sm text-muted-foreground">
                      {t('setsPage.splitPreview', { count: splitPreview })}
                    </p>
                  ) : exceedsPartCap ? (
                    <p className="text-sm text-destructive">
                      {t('setsPage.splitTooManyParts', { max: MAX_SPLIT_PARTS })}
                    </p>
                  ) : (
                    <p className="text-sm text-destructive">
                      {t('setsPage.splitInvalid', { max: maxChunkSize || 1 })}
                    </p>
                  )}
                  {splitError && <p className="text-sm text-destructive">{splitError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSplitOpen(false)}>
                      {t('ui.cancel')}
                    </Button>
                    <Button
                      disabled={!canSubmitSplit}
                      onClick={() => {
                        if (splitSet.isPending || !canSubmitSplit) {
                          return;
                        }
                        setSplitError(null);
                        splitSet.mutate(
                          { setId, chunkSize },
                          {
                            onSuccess: (result) => {
                              setSplitOpen(false);
                              const firstId = result.data[0]?.id;
                              if (firstId) {
                                router.push(`/sets/${firstId}`);
                              } else {
                                router.push('/sets');
                              }
                            },
                            onError: () => setSplitError(t('setsPage.splitFailed')),
                          }
                        );
                      }}
                    >
                      {splitSet.isPending ? t('setsPage.splitting') : t('setsPage.splitConfirm')}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
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
