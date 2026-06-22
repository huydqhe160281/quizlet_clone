import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api-error';
import { requireUserId } from '@/server/auth-utils';
import { getSet } from '@/server/services/set.service';
import { getCards } from '@/server/services/card.service';
import { StudySettingsForm } from '@/features/study/components/StudySettingsForm';

type StudyPageProps = {
  params: Promise<{ setId: string }>;
};

export default async function StudyPage({ params }: StudyPageProps) {
  const { setId } = await params;
  const userId = await requireUserId();

  let set;
  try {
    set = await getSet(setId, userId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const cards = await getCards(setId, userId);

  return (
    <main className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link
            href={`/sets/${setId}`}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to set
          </Link>
        </Button>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{set.title}</h1>
        <p className="text-muted-foreground mt-1">Choose your study mode and settings.</p>
      </div>
      <StudySettingsForm setId={setId} totalCards={cards.length} />
    </main>
  );
}
