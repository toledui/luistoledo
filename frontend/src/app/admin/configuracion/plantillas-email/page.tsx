import type { Metadata } from "next";
import { TemplateEditor } from "./template-editor";
export const metadata: Metadata = { title: "Plantillas de correo" };
export default function EmailTemplatesPage() {
  return <TemplateEditor />;
}
