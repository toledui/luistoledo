"use client";
import { apiFetch } from "@/lib/api";
import { CheckCircle2, Clock3, LoaderCircle, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "../sales-admin.module.css";
type Order = {
  id: string;
  number: string;
  status: string;
  total: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
  items: { id: string; title: string }[];
  payments: { provider: string; status: string }[];
};
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    void apiFetch<Order[]>("/admin/orders").then(setOrders);
  }, []);
  async function approve(orderId: string) {
    await apiFetch(`/admin/orders/${orderId}/approve-transfer`, {
      method: "POST",
    });
    setOrders(await apiFetch<Order[]>("/admin/orders"));
  }
  if (!orders)
    return (
      <div className={styles.state}>
        <LoaderCircle />
        Cargando pedidos…
      </div>
    );
  return (
    <main className={styles.page}>
      <header>
        <div>
          <span>Ventas</span>
          <h1>Pedidos</h1>
          <p>Consulta pagos, alumnos y productos comprados.</p>
        </div>
        <ReceiptText />
      </header>
      <div className={styles.table}>
        <div>
          <span>Pedido</span>
          <span>Alumno</span>
          <span>Cursos</span>
          <span>Pago</span>
          <span>Total</span>
        </div>
        {orders.map((order) => (
          <article key={order.id}>
            <strong>
              {order.number}
              <small>
                {new Date(order.createdAt).toLocaleDateString("es-MX")}
              </small>
            </strong>
            <span>
              {order.user.firstName} {order.user.lastName}
              <small>{order.user.email}</small>
            </span>
            <span>{order.items.map((item) => item.title).join(", ")}</span>
            <b>
              {order.status === "PAID" ? <CheckCircle2 /> : <Clock3 />}
              {order.status}
              <small>{order.payments[0]?.provider}</small>
            </b>
            <strong>${Number(order.total).toLocaleString("es-MX")}</strong>
            {order.status === "AWAITING_PAYMENT" &&
              order.payments[0]?.provider === "BANK_TRANSFER" && (
                <button onClick={() => void approve(order.id)}>
                  Aprobar transferencia
                </button>
              )}
          </article>
        ))}
      </div>
    </main>
  );
}
