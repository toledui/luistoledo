import type { Metadata } from "next";
import { CoursesList } from "./courses-list";
export const metadata: Metadata = { title: "Administración de cursos" };
export default function CoursesPage() {
  return <CoursesList />;
}
