"use client";
import { apiFetch } from "@/lib/api";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../../commerce.module.css";
import { StudentNavbar } from "@/components/student-navbar/student-navbar";
type Order = {
  id: string;
  number: string;
  status: string;
  total: string;
  createdAt: string;
  items: { id: string; title: string; course: { slug: string } }[];
};
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    void apiFetch<Order[]>("/orders").then(setOrders);
  }, []);
  if (!orders)
    return (
      <main className={styles.state}>
        <LoaderCircle className={styles.spin} />
        Cargando pedidos…
      </main>
    );
  return (
    <>
      <StudentNavbar />
      <main className={styles.page}>
      <div className={styles.orders}>
        <div className={styles.title}>
          <ReceiptText />
          <div>
            <span>Compras</span>
            <h1>Historial de pedidos</h1>
          </div>
        </div>
        {orders.length ? (
          orders.map((order) => (
            <article key={order.id}>
              <header>
                <div>
                  <span>{order.number}</span>
                  <time>
                    {new Date(order.createdAt).toLocaleDateString("es-MX")}
                  </time>
                </div>
                <b>
                  {order.status === "PAID" ? <CheckCircle2 /> : <Clock3 />}
                  {order.status}
                </b>
              </header>
              {order.items.map((item) => (
                <div key={item.id}>
                  <Link href={`/cursos/${item.course.slug}`}>{item.title}</Link>
                </div>
              ))}
              <footer>
                Total:{" "}
                <strong>
                  ${Number(order.total).toLocaleString("es-MX")} MXN
                </strong>
              </footer>
            </article>
          ))
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
