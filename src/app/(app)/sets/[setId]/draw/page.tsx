import { StudyPageClient } from '@/features/study/components/StudyPageClient';

type PageProps = { params: Promise<{ setId: string }> };

export default async function DrawStudyPage({ params }: PageProps) {
  const { setId } = await params;
  return <StudyPageClient setId={setId} mode="DRAW" />;
}
