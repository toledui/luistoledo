import type { Metadata } from "next";
import { CourseCatalog } from "./course-catalog";
export const metadata: Metadata = { title: "Cursos" };
export default function CoursesCatalogPage() {
  return <CourseCatalog />;
}
