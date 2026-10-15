"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatMxn } from "@/lib/paid-course";
import styles from "./registrations.module.css";
type Plan = {
  id: string;
  option: string;
  total: string;
  paid: number;
  balance: number;
  activatedAt: string | null;
  completedAt: string | null;
  remindersEnabled: boolean;
  user: { firstName: string; lastName: string; email: string };
  orders: {
    id: string;
    number: string;
    total: string;
    status: string;
    dueAt: string | null;
  }[];
};
type Plans = {
  items: Plan[];
  pagination: { page: number; pages: number; total: number };
};
type Summary = {
  registered: number;
  cash: number;
  installments: number;
  collected: number;
  outstanding: number;
  overdueOrders: number;
};
export default function PaidCourseRegistrations() {
  const [data, setData] = useState<Plans | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(state ? { state } : {}),
      });
      const [plans, totals] = await Promise.all([
        apiFetch<Plans>(`/admin/paid-course/plans?${params}`),
        apiFetch<Summary>("/admin/paid-course/summary"),
      ]);
      setData(plans);
      setSummary(totals);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible consultar las inscripciones",
      );
    } finally {
      setBusy(false);
    }
  }, [page, search, state]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function toggle(plan: Plan) {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/admin/paid-course/plans/${plan.id}/reminders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remindersEnabled: !plan.remindersEnabled }),
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No fue posible actualizar",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      <header>
        <span>Curso en vivo · Noviembre 2026</span>
        <h1>Inscripciones y parcialidades</h1>
        <p>
          Implementa tu Propio Asistente de IA 24/7 · 21 y 28 de noviembre, 5 de
          diciembre.
        </p>
      </header>
      {summary && (
        <div className={styles.summary}>
          {[
            ["Inscritos confirmados", summary.registered],
            ["De contado", summary.cash],
            ["A parcialidades", summary.installments],
            ["Cobrado", formatMxn(summary.collected)],
            ["Por cobrar", formatMxn(summary.outstanding)],
            ["Órdenes vencidas", summary.overdueOrders],
          ].map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      )}
      <div className={styles.filters}>
        <input
          aria-label="Buscar alumno"
          placeholder="Nombre o correo del alumno"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Estado de inscripción"
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los planes</option>
          <option value="PENDING">Inscripción sin pagar</option>
          <option value="ACTIVE">Inscrito con saldo pendiente</option>
          <option value="COMPLETED">Liquidado</option>
          <option value="OVERDUE">Con pagos vencidos</option>
        </select>
        <button disabled={busy} onClick={() => void load()}>
          Actualizar
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Cargando…</p>}
      {data?.items.map((plan) => (
        <article key={plan.id} className={styles.plan}>
          <header>
            <div>
              <h2>
                {plan.user.firstName} {plan.user.lastName}
              </h2>
              <p>{plan.user.email}</p>
            </div>
            <strong>
              {!plan.activatedAt
                ? "Inscripción sin pagar"
                : plan.completedAt
                  ? "Liquidado"
                  : "Inscrito · saldo pendiente"}
            </strong>
          </header>
          <p>
            {plan.option === "FULL" ? "Contado" : "Apartado + 2 parcialidades"}{" "}
            · Total: {formatMxn(Number(plan.total))} · Pagado:{" "}
            {formatMxn(plan.paid)} ·{" "}
            {plan.activatedAt ? "Saldo" : "Pedido pendiente"}:{" "}
            {formatMxn(plan.balance)}
          </p>
          <div className={styles.orderList}>
            {plan.orders.map((order) => (
              <div key={order.id}>
                <Link href="/admin/pedidos">{order.number}</Link>
                <span>{formatMxn(Number(order.total))}</span>
                <span>
                  {order.status === "PAID"
                    ? "Pagado"
                    : order.status === "AWAITING_PAYMENT"
                      ? "Transferencia pendiente"
                      : "Pago pendiente"}
                </span>
                <span>
                  {order.dueAt
                    ? new Date(order.dueAt).toLocaleString("es-MX", {
                        timeZone: "America/Mexico_City",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}{" "}
                  CDMX
                </span>
              </div>
            ))}
          </div>
          {plan.option === "INSTALLMENTS" &&
            plan.activatedAt &&
            !plan.completedAt && (
              <button disabled={busy} onClick={() => void toggle(plan)}>
                {plan.remindersEnabled
                  ? "Pausar recordatorios semanales"
                  : "Activar recordatorios semanales"}
              </button>
            )}
        </article>
      ))}
      {data && !data.items.length && <p>No se encontraron inscripciones.</p>}
      {data && (
        <footer>
          <span>
            {data.pagination.total} planes · Página {data.pagination.page} de{" "}
            {data.pagination.pages}
          </span>
          <button
            disabled={busy || page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <button
            disabled={busy || page >= data.pagination.pages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </footer>
      )}
    </main>
  );
}
