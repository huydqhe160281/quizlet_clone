'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadMoreButton } from '@/components/shared/LoadMoreButton';
import { useSetMutations, useSets } from '@/features/sets/hooks/useSets';
import { suggestMergedTitle } from '@/features/sets/lib/merge-title';
import {
  MAX_MERGE_SETS,
  MAX_MERGED_CARDS,
  MIN_MERGE_SETS,
  SET_DESCRIPTION_MAX,
  SET_TITLE_MAX,
} from '@/features/sets/schemas/set.schema';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

export type MergeCandidate = { id: string; title: string; cardCount: number };

type MergeSetsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sets ticked when the dialog opens, in merge order. */
  initialSelection: MergeCandidate[];
};

export function MergeSetsDialog({ open, onOpenChange, initialSelection }: MergeSetsDialogProps) {
  const { mergeSets } = useSetMutations();

  return (
    // Closing mid-request would drop the toast and the redirect to the new set.
    <Dialog open={open} onOpenChange={(next) => !mergeSets.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[560px]">
        {/* Radix mounts the form only while open: fresh state each time, and the
            set list is not fetched for pages that never open the dialog. */}
        <MergeSetsForm
          mergeSets={mergeSets}
          onClose={() => onOpenChange(false)}
          initialSelection={initialSelection}
        />
      </DialogContent>
    </Dialog>
  );
}

type MergeSetsFormProps = {
  mergeSets: ReturnType<typeof useSetMutations>['mergeSets'];
  onClose: () => void;
  initialSelection: MergeCandidate[];
};

function MergeSetsForm({ mergeSets, onClose, initialSelection }: MergeSetsFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSets();
  const [selection, setSelection] = useState<MergeCandidate[]>(initialSelection);
  const [title, setTitle] = useState('');
  const [titleEdited, setTitleEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [deleteSources, setDeleteSources] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const suggestedTitle = suggestMergedTitle(selection.map((set) => set.title));
  const effectiveTitle = titleEdited ? title : suggestedTitle;

  const candidates: MergeCandidate[] = (data?.pages.flatMap((page) => page.data) ?? []).map(
    (set) => ({ id: set.id, title: set.title, cardCount: set._count.cards })
  );
  // Keep a preselected set listed even when it is not on a loaded page yet.
  for (const set of selection) {
    if (!candidates.some((candidate) => candidate.id === set.id)) {
      candidates.unshift(set);
    }
  }

  const totalCards = selection.reduce((sum, set) => sum + set.cardCount, 0);
  const tooFew = selection.length < MIN_MERGE_SETS;
  const tooMany = selection.length > MAX_MERGE_SETS;
  // With de-duplication on, the server decides whether the result still fits.
  const tooManyCards = !removeDuplicates && totalCards > MAX_MERGED_CARDS;
  const canSubmit =
    !tooFew &&
    !tooMany &&
    !tooManyCards &&
    totalCards > 0 &&
    effectiveTitle.trim().length > 0 &&
    !mergeSets.isPending;

  const toggle = (candidate: MergeCandidate, checked: boolean) => {
    setError(null);
    setSelection((current) =>
      checked
        ? [...current.filter((set) => set.id !== candidate.id), candidate]
        : current.filter((set) => set.id !== candidate.id)
    );
  };

  const submit = () => {
    if (!canSubmit) {
      return;
    }
    setError(null);
    mergeSets.mutate(
      {
        setIds: selection.map((set) => set.id),
        title: effectiveTitle.trim(),
        description: description.trim() || undefined,
        removeDuplicates,
        deleteSources,
      },
      {
        onSuccess: (result) => {
          const skipped = result.meta.duplicatesSkipped;
          toast.success(
            skipped > 0
              ? t('setsPage.mergeDoneWithDuplicates', { count: skipped })
              : t('setsPage.mergeDone')
          );
          onClose();
          router.push(`/sets/${result.data.id}`);
        },
        onError: (mergeError) =>
          setError(
            mergeError.message === 'CARD_LIMIT_EXCEEDED'
              ? t('setsPage.mergeTooManyCards', { max: MAX_MERGED_CARDS })
              : t('setsPage.mergeFailed')
          ),
      }
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('setsPage.mergeTitle')}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">{t('setsPage.mergeHint')}</p>
      <div className="space-y-4">
        <div className="space-y-2">
          <p id="merge-sets-label" className="text-sm font-medium">
            {t('setsPage.mergeChooseSets')}
          </p>
          <ul
            aria-labelledby="merge-sets-label"
            data-slot="well"
            className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2"
          >
            {candidates.map((candidate) => {
              const order = selection.findIndex((set) => set.id === candidate.id);
              const inputId = `merge-set-${candidate.id}`;
              return (
                <li key={candidate.id}>
                  <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                    <Checkbox
                      id={inputId}
                      checked={order >= 0}
                      onCheckedChange={(checked) => toggle(candidate, checked === true)}
                    />
                    <Label
                      htmlFor={inputId}
                      className="min-w-0 flex-1 cursor-pointer truncate font-normal"
                      title={candidate.title}
                    >
                      {candidate.title}
                    </Label>
                    {order >= 0 && (
                      <Badge
                        variant="outline"
                        aria-label={t('setsPage.mergeOrder', { n: order + 1 })}
                      >
                        #{order + 1}
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      {t('ui.cardsCount', { count: candidate.cardCount })}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
          <LoadMoreButton
            hasMore={hasNextPage ?? false}
            isLoading={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            label={t('setsPage.loadMore')}
          />
          <p className="text-sm text-muted-foreground">
            {t('setsPage.mergeSummary', { sets: selection.length, cards: totalCards })}
          </p>
          {tooFew && (
            <p className="text-sm text-muted-foreground">
              {t('setsPage.mergeTooFew', { min: MIN_MERGE_SETS })}
            </p>
          )}
          {tooMany && (
            <p className="text-sm text-destructive">
              {t('setsPage.mergeTooManySets', { max: MAX_MERGE_SETS })}
            </p>
          )}
          {tooManyCards && (
            <p className="text-sm text-destructive">
              {t('setsPage.mergeTooManyCards', { max: MAX_MERGED_CARDS })}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="merge-title">{t('setsPage.mergeNameLabel')}</Label>
          <Input
            id="merge-title"
            value={effectiveTitle}
            maxLength={SET_TITLE_MAX}
            onChange={(event) => {
              setTitleEdited(true);
              setTitle(event.target.value);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="merge-description">{t('setsPage.mergeDescriptionLabel')}</Label>
          <Textarea
            id="merge-description"
            value={description}
            maxLength={SET_DESCRIPTION_MAX}
            rows={2}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="merge-dedupe"
            checked={removeDuplicates}
            onCheckedChange={(checked) => {
              setError(null);
              setRemoveDuplicates(checked === true);
            }}
          />
          <div className="text-sm">
            <Label htmlFor="merge-dedupe" className="cursor-pointer">
              {t('setsPage.mergeRemoveDuplicates')}
            </Label>
            <p className="text-muted-foreground">{t('setsPage.mergeRemoveDuplicatesHint')}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="merge-delete-sources"
            checked={deleteSources}
            onCheckedChange={(checked) => setDeleteSources(checked === true)}
          />
          <div className="text-sm">
            <Label htmlFor="merge-delete-sources" className="cursor-pointer">
              {t('setsPage.mergeDeleteSources')}
            </Label>
            <p className="text-muted-foreground">{t('setsPage.mergeDeleteSourcesHint')}</p>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={mergeSets.isPending} onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            {mergeSets.isPending ? t('setsPage.merging') : t('setsPage.mergeConfirm')}
          </Button>
        </div>
      </div>
    </>
  );
}
