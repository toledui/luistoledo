import type { Metadata } from "next";
import { MasterclassRegistrations } from "./registrations";
export const metadata: Metadata = { title: "Registros de masterclass" };
export default function Page() {
  return <MasterclassRegistrations />;
}
