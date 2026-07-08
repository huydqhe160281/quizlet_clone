import { redirect } from 'next/navigation';

type StudyPageProps = {
  params: Promise<{ setId: string }>;
};

export default async function StudyPage({ params }: StudyPageProps) {
  const { setId } = await params;
  redirect(`/sets/${setId}?studySettings=1`);
}
