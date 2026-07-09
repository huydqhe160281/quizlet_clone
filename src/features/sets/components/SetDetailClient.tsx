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

type SetDetailClientProps = {
  setId: string;
};

export function SetDetailClient({ setId }: SetDetailClientProps) {
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
      <RedirectingNotice
        error={loadError}
        fallbackHref="/sets"
        message="Không tìm thấy bộ thẻ. Đang quay lại…"
      />
    );
  }

  if (isLoading || !set) {
    return (
      <div className="glass-panel animate-pulse rounded-2xl p-8 text-sm text-muted-foreground">
        Loading set…
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
            Back to sets
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {set.title}
          </h1>
          <p className="mt-1 text-muted-foreground">{set.description ?? 'No description'}</p>
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">{set._count.cards} cards</Badge>
            <Badge variant="outline">{set.visibility.toLowerCase()}</Badge>
            {set.language && <Badge variant="outline">{set.language}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit set</DialogTitle>
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
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Upload className="mr-2 h-4 w-4" />
                Import
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
            className="flex-1 sm:flex-none"
            onClick={() =>
              duplicateSet.mutate(setId, {
                onSuccess: (result) => router.push(`/sets/${result.data.id}`),
              })
            }
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => {
              if (window.confirm('Delete this set and all cards?')) {
                deleteSet.mutate(setId, { onSuccess: () => router.push('/sets') });
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="glass-panel animate-pulse rounded-2xl p-8 text-sm text-muted-foreground">
            Loading study modes…
          </div>
        }
      >
        <StudyLauncher setId={setId} cardCount={set._count.cards} newWordCount={newWordCount} />
      </Suspense>
      <CardEditor setId={setId} />
    </div>
  );
}
