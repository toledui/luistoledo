import { BlogEditor } from "./post-editor";
export const metadata = {
  title: "Constructor de publicaciones",
  robots: { index: false, follow: false },
};
export default async function BlogEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <BlogEditor id={(await params).id} />;
}
