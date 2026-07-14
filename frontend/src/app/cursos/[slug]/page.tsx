import { CoursePublicView } from "./course-public-view";

export default async function PublicCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  return <CoursePublicView slug={slug} adminPreview={query.preview === "1"} />;
}
