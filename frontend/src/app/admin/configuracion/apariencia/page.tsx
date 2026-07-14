import type { Metadata } from "next";
import { BrandingForm } from "./branding-form";

export const metadata: Metadata = { title: "Apariencia y branding" };

export default function AppearancePage() {
  return <BrandingForm />;
}
