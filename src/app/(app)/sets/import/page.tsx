import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requireUserId } from '@/server/auth-utils';
import { ImportSetWizard } from '@/features/sets/components/ImportSetWizard';

export default async function ImportSetPage() {
  // Ensure user is authenticated; throws 401 if not
  await requireUserId();

  return (
    <main className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link
            href="/sets"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sets
          </Link>
        </Button>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Import flashcard set</h1>
        <p className="text-muted-foreground mt-1">
          Import cards from a CSV file or paste JSON to create a new set instantly.
        </p>
      </div>
      <ImportSetWizard />
    </main>
  );
}
