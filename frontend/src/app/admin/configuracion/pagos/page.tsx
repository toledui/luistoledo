import type { Metadata } from "next";
import { PaymentSettings } from "./payment-settings";

export const metadata: Metadata = { title: "Configuración de pagos" };

export default function PaymentsSettingsPage() {
  return <PaymentSettings />;
}
