"use client";

import { apiFetch } from "@/lib/api";
import { Clock3, Landmark, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import styles from "../../commerce.module.css";

type Order = { number: string; total: string; status: string };
type Bank = {
  bankName?: string;
  bankBeneficiary?: string;
  bankAccount?: string;
  bankClabe?: string;
  bankInstructions?: string;
  paymentDeadlineHours: number;
};

function PendingTransfer() {
  const orderId = useSearchParams().get("order");
  const [data, setData] = useState<{ order: Order; bank: Bank } | null>(null);
  useEffect(() => {
    if (!orderId) return;
    void Promise.all([
      apiFetch<Order>(`/orders/${orderId}`),
      apiFetch<Bank>("/payments/methods"),
    ]).then(([order, bank]) => setData({ order, bank }));
  }, [orderId]);
  if (!data) return <main className={styles.state}><LoaderCircle className={styles.spin} />Preparando referencia…</main>;
  return (
    <main className={styles.success}>
      <Landmark />
      <span>Transferencia pendiente</span>
      <h1>Realiza tu transferencia</h1>
      <p>Usa el pedido <strong>{data.order.number}</strong> como referencia.</p>
      <div>
        <strong>{data.bank.bankName}</strong>
        <span>Beneficiario: {data.bank.bankBeneficiary}</span>
        {data.bank.bankClabe && <span>CLABE: {data.bank.bankClabe}</span>}
        {data.bank.bankAccount && <span>Cuenta: {data.bank.bankAccount}</span>}
        <strong>${Number(data.order.total).toLocaleString("es-MX")} MXN</strong>
        <p>{data.bank.bankInstructions}</p>
        <small><Clock3 /> Tienes {data.bank.paymentDeadlineHours} horas para realizar el pago.</small>
      </div>
      <Link href="/mi-aprendizaje/pedidos">Ver mis pedidos</Link>
    </main>
  );
}

export default function PendingTransferPage() {
  return <Suspense><PendingTransfer /></Suspense>;
}
