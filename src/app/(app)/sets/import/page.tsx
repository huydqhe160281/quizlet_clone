import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requireUserId } from '@/server/auth/auth-utils';
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
      <ImportSetWizard variant="page" />
    </main>
  );
}
