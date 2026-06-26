'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Copy, Pencil, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { CardEditor } from '@/features/sets/cards/components/CardEditor';
import { StudyLauncher } from '@/features/study/components/StudyLauncher';
import { useSet, useSetMutations } from '@/features/sets/hooks/useSets';
import { ImportSetWizard } from '@/features/sets/components/ImportSetWizard';

type SetDetailClientProps = {
  setId: string;
};

export function SetDetailClient({ setId }: SetDetailClientProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const { data: set, isLoading } = useSet(setId);
  const { deleteSet, duplicateSet } = useSetMutations();

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
          <Button variant="outline" asChild>
            <Link href={`/sets/${setId}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <ImportSetWizard
                setId={setId}
                onSuccess={() => {
                  setImportOpen(false);
                  window.location.reload();
                }}
              />
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
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
      <StudyLauncher setId={setId} cardCount={set._count.cards} />
      <CardEditor setId={setId} />
    </div>
  );
}
