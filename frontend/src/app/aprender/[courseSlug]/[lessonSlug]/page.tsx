import { LearningPlayer } from "./learning-player";

export default async function LearningPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}) {
  const { courseSlug, lessonSlug } = await params;
  return (
    <LearningPlayer courseSlug={courseSlug} initialLessonId={lessonSlug} />
  );
}
