"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { masterclass } from "@/lib/masterclass";
import styles from "./registrations.module.css";

type Registration = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  createdAt: string;
  consentAt: string;
  notification: {
    status: string;
    sentAt?: string;
    errorMessage?: string;
    recipient: string;
  } | null;
};
type Result = {
  items: Registration[];
  total: number;
  page: number;
  limit: number;
  recipientConfigured: boolean;
};
const statusLabels: Record<string, string> = {
  SENT: "Enviado",
  PROCESSING: "Enviando",
  PENDING: "Pendiente / reintento",
  FAILED: "Falló",
  CANCELLED: "Cancelado",
};
const date = (value: string) =>
  new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  });

export function MasterclassRegistrations() {
  const [result, setResult] = useState<Result>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retrying, setRetrying] = useState("");
  const [revision, setRevision] = useState(0);
  const load = useCallback(
    () =>
      apiFetch<Result>(
        `/admin/masterclass/registrations?${new URLSearchParams({ page: String(page), limit: "25", search: filter })}`,
      ),
    [page, filter],
  );
  useEffect(() => {
    let active = true;
    load()
      .then((value) => {
        if (active) setResult(value);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los registros",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, revision]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPage(1);
    setFilter(search.trim());
    setRevision((value) => value + 1);
  }
  async function retry(item: Registration) {
    setRetrying(item.id);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/admin/masterclass/registrations/${item.id}/notify`, {
        method: "POST",
      });
      const updated = await load();
      setResult(updated);
      const status = updated.items.find((value) => value.id === item.id)
        ?.notification?.status;
      setNotice(
        status === "SENT"
          ? "Aviso enviado al correo configurado. Si usas el proveedor LOG, solo se registra una simulación."
          : "El aviso quedó guardado para reintento. Consulta su estado y la configuración de correo.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo procesar el aviso.",
      );
    } finally {
      setRetrying("");
    }
  }

  return (
    <main className={styles.page}>
      <header>
        <div>
          <span className={styles.kicker}>FORMACIÓN EN VIVO</span>
          <h1>Registros de masterclass</h1>
          <p>{masterclass.title}</p>
          <p>
            {masterclass.date} · {masterclass.time} · Ciudad de México
          </p>
        </div>
        <Link href="/masterclass" target="_blank" rel="noopener noreferrer">
          Ver landing ↗
        </Link>
      </header>
      <div className={styles.toolbar}>
        <strong>
          {result?.total ?? "—"}{" "}
          {filter ? "registros encontrados" : "personas inscritas"}
        </strong>
        <button
          type="button"
          onClick={() => { setLoading(true); setError(""); setRevision((value) => value + 1); }}
          disabled={loading}
        >
          Actualizar
        </button>
      </div>
      {result && !result.recipientConfigured && (
        <p role="alert" className={styles.warning}>
          No hay correo receptor configurado. Los registros se guardan, pero los
          avisos no se envían.{" "}
          <Link href="/admin/configuracion/contacto">
            Configurar correo para formularios
          </Link>{" "}
          y después pulsa «Enviar aviso» en los registros pendientes.
        </p>
      )}
      <p className={styles.help}>
        Los avisos usan el destinatario de{" "}
        <Link href="/admin/configuracion/contacto">
          Configuración → Contacto
        </Link>{" "}
        y el proveedor de{" "}
        <Link href="/admin/configuracion/correo">Configuración → Correo</Link>.
        En modo LOG no se entregan correos reales. Fechas en hora de Ciudad de
        México.
      </p>
      <form className={styles.search} onSubmit={submitSearch}>
        <label htmlFor="registration-search">
          Buscar por nombre, correo o WhatsApp
        </label>
        <div>
          <input
            id="registration-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={160}
            placeholder="Nombre, correo o teléfono"
          />
          <button>Buscar</button>
        </div>
      </form>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.warning}>
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Cargando registros…</p>
      ) : (
        result && (
          <>
            {!result.items.length ? (
              <div className={styles.empty}>
                {filter
                  ? "No hay registros que coincidan con la búsqueda."
                  : "Aún no hay inscripciones. Comparte la landing para comenzar a recibir registros."}
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Participante</th>
                      <th>WhatsApp</th>
                      <th>Inscripción</th>
                      <th>Aviso por correo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                          <a href={`mailto:${item.email}`}>{item.email}</a>
                          <small>Consentimiento: {date(item.consentAt)}</small>
                        </td>
                        <td>
                          <a
                            href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {item.whatsapp} ↗
                          </a>
                        </td>
                        <td>
                          <time dateTime={item.createdAt}>
                            {date(item.createdAt)}
                          </time>
                        </td>
                        <td>
                          <span
                            className={`${styles.status} ${item.notification?.status === "SENT" ? styles.sent : ""}`}
                          >
                            {item.notification
                              ? statusLabels[item.notification.status] ||
                                item.notification.status
                              : "Sin aviso"}
                          </span>
                          {item.notification && (
                            <small>Para: {item.notification.recipient}</small>
                          )}
                          {item.notification?.sentAt && (
                            <small>{date(item.notification.sentAt)}</small>
                          )}
                          {item.notification?.errorMessage && (
                            <small className={styles.error}>
                              {item.notification.errorMessage}
                            </small>
                          )}
                          {(!item.notification ||
                            ["PENDING", "FAILED", "CANCELLED"].includes(
                              item.notification.status,
                            )) && (
                            <button
                              type="button"
                              disabled={Boolean(retrying)}
                              onClick={() => void retry(item)}
                            >
                              {retrying === item.id
                                ? "Procesando…"
                                : item.notification
                                  ? "Reintentar aviso"
                                  : "Enviar aviso"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className={styles.pagination}>
              <button
                disabled={page <= 1}
            onClick={() => { setLoading(true); setError(""); setPage((value) => value - 1); }}
              >
                Anterior
              </button>
              <span>
                Página {page} de{" "}
                {Math.max(1, Math.ceil(result.total / result.limit))}
              </span>
              <button
                disabled={page * result.limit >= result.total}
            onClick={() => { setLoading(true); setError(""); setPage((value) => value + 1); }}
              >
                Siguiente
              </button>
            </div>
          </>
        )
      )}
    </main>
  );
}
