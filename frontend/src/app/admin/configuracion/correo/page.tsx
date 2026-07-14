import type { Metadata } from "next";
import { EmailSettings } from "./email-settings";
export const metadata: Metadata = { title: "Configuración de correo" };
export default function EmailSettingsPage() {
  return <EmailSettings />;
}
