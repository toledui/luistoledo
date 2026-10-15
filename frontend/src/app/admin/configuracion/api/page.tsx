import type { Metadata } from "next";
import { ApiKeys } from "./api-keys";
export const metadata: Metadata = { title: "API y agentes" };
export default function Page() { return <ApiKeys />; }
