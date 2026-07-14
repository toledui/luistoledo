import { CourseEditor } from "./course-editor";
export default async function CourseEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CourseEditor id={(await params).id} />;
}
