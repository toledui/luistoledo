"use client";
import { apiFetch } from "@/lib/api";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Landmark,
  LoaderCircle,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import styles from "../../commerce.module.css";
type Order = {
  id: string;
  number: string;
  status: string;
  total: string;
  createdAt: string;
  items: { id: string; title: string; course: { slug: string } }[];
  payments: { id: string; provider: string; status: string }[];
};
type ResumePaymentResult = { orderId: string; checkoutUrl: string };

const statusLabels: Record<string, string> = {
  PENDING: "Pago pendiente",
  AWAITING_PAYMENT: "Esperando transferencia",
  PAID: "Pagado",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const paymentCancelled = searchParams.get("cancelled") === "1";
  const cancelledOrderId = searchParams.get("order") ?? "";
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [resumingOrderId, setResumingOrderId] = useState("");
  const [resumeError, setResumeError] = useState<{
    orderId: string;
    message: string;
  } | null>(null);
  useEffect(() => {
    void apiFetch<Order[]>("/orders").then(setOrders);
  }, []);
  async function resumePayment(orderId: string) {
    setResumingOrderId(orderId);
    setResumeError(null);
    try {
      const result = await apiFetch<ResumePaymentResult>(
        `/orders/${orderId}/resume-payment`,
        { method: "POST" },
      );
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setResumeError({
        orderId,
        message:
          cause instanceof Error
            ? cause.message
            : "No fue posible reanudar el pago.",
      });
      setResumingOrderId("");
    }
  }
  if (!orders)
    return (
      <main className={styles.state}>
        <LoaderCircle className={styles.spin} />
        Cargando pedidos…
      </main>
    );
  return (
    <>
      <main className={styles.page}>
      <div className={styles.orders}>
        <div className={styles.title}>
          <ReceiptText />
          <div>
            <span>Compras</span>
            <h1>Historial de pedidos</h1>
          </div>
        </div>
        {paymentCancelled && (
          <div className={styles.paymentCancelledNotice} role="status">
            <Clock3 />
            <div>
              <strong>Tu pago no se completó</strong>
              <p>
                La orden quedó guardada. Puedes continuar el pago cuando lo
                desees desde el pedido pendiente.
              </p>
            </div>
          </div>
        )}
        {orders.length ? (
          orders.map((order) => {
            const stripePending =
              order.status === "PENDING" &&
              order.payments.some(
                (payment) =>
                  payment.provider === "STRIPE" &&
                  payment.status === "PENDING",
              );
            const transferPending =
              order.status === "AWAITING_PAYMENT" &&
              order.payments.some(
                (payment) =>
                  payment.provider === "BANK_TRANSFER" &&
                  payment.status === "PENDING",
              );
            return (
              <article
                key={order.id}
                id={`order-${order.id}`}
                className={
                  cancelledOrderId === order.id ? styles.cancelledOrder : ""
                }
              >
              <header>
                <div>
                  <span>{order.number}</span>
                  <time>
                    {new Date(order.createdAt).toLocaleDateString("es-MX")}
                  </time>
                </div>
                <b>
                  {order.status === "PAID" ? <CheckCircle2 /> : <Clock3 />}
                  {statusLabels[order.status] ?? order.status}
                </b>
              </header>
              {order.items.map((item) => (
                <div key={item.id}>
                  <Link href={`/cursos/${item.course.slug}`}>{item.title}</Link>
                </div>
              ))}
              <footer>
                <span>
                  Total:{" "}
                  <strong>
                    ${Number(order.total).toLocaleString("es-MX")} MXN
                  </strong>
                </span>
                {(stripePending || transferPending) && (
                  <div className={styles.orderActions}>
                    {stripePending && (
                      <button
                        type="button"
                        onClick={() => void resumePayment(order.id)}
                        disabled={Boolean(resumingOrderId)}
                      >
                        {resumingOrderId === order.id ? (
                          <LoaderCircle className={styles.spin} />
                        ) : (
                          <CreditCard />
                        )}
                        {resumingOrderId === order.id
                          ? "Preparando pago…"
                          : "Completar pago"}
                      </button>
                    )}
                    {transferPending && (
                      <Link href={`/checkout/pendiente?order=${order.id}`}>
                        <Landmark /> Ver datos de transferencia
                      </Link>
                    )}
                  </div>
                )}
                {resumeError?.orderId === order.id && (
                  <small className={styles.orderPaymentError} role="alert">
                    {resumeError.message}
                  </small>
                )}
              </footer>
              </article>
            );
          })
        ) : (
          <div className={styles.empty}>
            <ReceiptText />
            <h2>Aún no tienes pedidos</h2>
            <Link href="/cursos">Explorar cursos</Link>
          </div>
        )}
      </div>
      </main>
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.state}>
          <LoaderCircle className={styles.spin} />
          Cargando pedidos…
        </main>
      }
    >
      <OrdersPageContent />
    </Suspense>
  );
}
