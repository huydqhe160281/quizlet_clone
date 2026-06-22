import { notFound } from 'next/navigation';
import { SetForm } from '@/features/sets/components/SetForm';
import { ApiError } from '@/lib/api-error';
import { requireUserId } from '@/server/auth-utils';
import { getSet } from '@/server/services/set.service';

type EditSetPageProps = {
  params: Promise<{ setId: string }>;
};

export default async function EditSetPage({ params }: EditSetPageProps) {
  const { setId } = await params;
  const userId = await requireUserId();

  try {
    const set = await getSet(setId, userId);
    if (set.userId !== userId) {
      notFound();
    }

    return (
      <SetForm
        mode="edit"
        setId={setId}
        initial={{
          title: set.title,
          description: set.description,
          language: set.language,
          visibility: set.visibility,
        }}
      />
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }
}
