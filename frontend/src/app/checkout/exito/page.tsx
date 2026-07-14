"use client";
import { apiFetch } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import styles from "../../commerce.module.css";
type Order = {
  number: string;
  status: string;
  total: string;
  items: { title: string }[];
};
function Success() {
  const id = useSearchParams().get("order");
  const sessionId = useSearchParams().get("session_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [confirmationError, setConfirmationError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id) return;
    let active = true;
    const load = async () => {
      const value = await apiFetch<Order>(`/orders/${id}`);
      if (active) setOrder(value);
      return value.status;
    };
    const confirm = async () => {
      setConfirmationError("");
      try {
        if (sessionId)
          await apiFetch("/payments/stripe/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: id, sessionId }),
          });
        await load();
      } catch (cause) {
        if (active)
          setConfirmationError(
            cause instanceof Error
              ? cause.message
              : "No fue posible confirmar el pago.",
          );
      }
    };
    void confirm();
    const timer = window.setInterval(() => {
      void load().then((status) => {
        if (status === "PAID") window.clearInterval(timer);
      });
    }, 2500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [id, sessionId, retry]);
  if (confirmationError && order?.status !== "PAID")
    return (
      <main className={styles.state}>
        <AlertCircle />
        <strong>No pudimos finalizar la confirmación</strong>
        <p>{confirmationError}</p>
        <button onClick={() => setRetry((value) => value + 1)}>
          <RefreshCw /> Reintentar confirmación
        </button>
      </main>
    );
  if (!order || order.status !== "PAID")
    return (
      <main className={styles.state}>
        <LoaderCircle className={styles.spin} />
        Confirmando pedido…
      </main>
    );
  return (
    <main className={styles.success}>
      <CheckCircle2 />
      <span>Pago confirmado</span>
      <h1>¡Tu acceso está listo!</h1>
      <p>
        Pedido <strong>{order.number}</strong> · $
        {Number(order.total).toLocaleString("es-MX")} MXN
      </p>
      <div>
        {order.items.map((item) => (
          <strong key={item.title}>{item.title}</strong>
        ))}
      </div>
      <Link href="/mi-aprendizaje">Ir a mi aprendizaje</Link>
      <Link href="/mi-aprendizaje/pedidos">Ver pedido</Link>
    </main>
  );
}
export default function SuccessPage() {
  return (
    <Suspense>
      <Success />
    </Suspense>
  );
}
