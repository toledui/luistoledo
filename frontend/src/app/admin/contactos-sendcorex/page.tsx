"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import styles from "../analitica/analytics.module.css";
import { CsvImporter } from "./csv-importer";

type Contact = {
  email: string;
  name: string;
  phone: string | null;
  sources: string[];
  registrations: number;
  missing: number;
  delivered: number;
  failed: number;
  pending: number;
  lastDeliveredAt: string | null;
  lastError: string | null;
  status: string;
};
type Directory = {
  imports: {
    id: string;
    filename: string;
    status: string;
    total: number;
    processed: number;
    invalid: number;
    duplicates: number;
    lastError: string | null;
  }[];
  items: Contact[];
  total: number;
  page: number;
  pageSize: number;
  summary: Record<string, number>;
  run: { status: string; scanned: number; completedAt: string | null } | null;
};
const labels: Record<string, string> = {
  NOT_QUEUED: "Sin enviar",
  PENDING: "Pendiente",
  DELIVERED: "Enviado",
  FAILED: "Con error",
};
export default function SendcorexContactsPage() {
  const [data, setData] = useState<Directory>();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "25",
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
        });
        const [directory, settings] = await Promise.all([
          apiFetch<Directory>(`/admin/sendcorex/contacts?${params}`),
          apiFetch<{ enabled: boolean; apiKeyConfigured: boolean }>(
            "/admin/sendcorex/settings",
          ),
        ]);
        if (active) {
          setData(directory);
          setEnabled(settings.enabled && settings.apiKeyConfigured);
          setError("");
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar los contactos",
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => {
      void load();
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [page, search, status, revision]);
  async function syncAll() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiFetch("/admin/sendcorex/sync-all", { method: "POST" });
      setMessage(
        "Sincronización iniciada para todos los contactos, incluidos los históricos. Puedes salir de esta pantalla: el proceso continuará en segundo plano.",
      );
      setRevision((value) => value + 1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo iniciar la sincronización",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.page}>
      <header>
        <div>
          <span className={styles.eyebrow}>Contactos</span>
          <h1>Contactos / Sendcorex</h1>
          <p>
            Inscripciones a cursos y masterclasses, contactos del boletín y
            directorios importados. Cada correo aparece una sola vez.
          </p>
        </div>
        <Link href="/admin/configuracion/sendcorex">Configurar Sendcorex</Link>
      </header>
      <CsvImporter onImported={() => setRevision((value) => value + 1)} />
      {data?.imports?.length ? (
        <section className={styles.panel}>
          <h2>Últimas importaciones CSV</h2>
          <div className={styles.table}>
            <table>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Progreso</th>
                  <th>Estado</th>
                  <th>Omitidos</th>
                </tr>
              </thead>
              <tbody>
                {data.imports.map((run) => (
                  <tr key={run.id}>
                    <td>{run.filename}</td>
                    <td>
                      {run.processed} de {run.total}
                    </td>
                    <td>
                      {run.status === "COMPLETED"
                        ? "Importado al directorio"
                        : run.lastError
                          ? "Reintentando el lote"
                          : "En proceso"}
                    </td>
                    <td>
                      {run.invalid} inválidos · {run.duplicates} duplicados
                      combinados
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            El progreso de importación corresponde al directorio local. Los
            estados de envío a Sendcorex aparecen en la tabla de contactos.
          </p>
        </section>
      ) : null}
      <section className={styles.panel}>
        <h2>Sincronización de todos los contactos</h2>
        <p>
          Incluye los registros anteriores a la integración y vuelve a enviar
          los contactos existentes para recuperar los que falten en Sendcorex.
          Se actualizan por correo y se conservan las bajas existentes. No
          incluye formularios que no aceptaron el boletín.
        </p>
        <p>
          El proceso empieza al pulsar el botón y avanza por lotes. “Enviado”
          significa que Sendcorex confirmó la recepción; no consulta si el
          contacto fue borrado posteriormente en Sendcorex.
        </p>
        {!enabled && (
          <p>
            Para sincronizar, guarda la clave API y activa Sendcorex en
            Configuración.
          </p>
        )}
        <button
          type="button"
          disabled={busy || !enabled || data?.run?.status === "RUNNING"}
          onClick={syncAll}
        >
          {busy || data?.run?.status === "RUNNING"
            ? "Sincronización en curso…"
            : "Sincronizar todos ahora"}
        </button>
        {data?.run && (
          <p role="status">
            {data.run.status === "RUNNING"
              ? `Preparando registros: ${data.run.scanned} revisados. Los envíos se realizan en paralelo al avance.`
              : data.run.status === "COMPLETED"
                ? `Preparación terminada: ${data.run.scanned} registros revisados. Consulta los pendientes y errores para ver el resultado de los envíos.`
                : "Sin sincronizaciones manuales todavía."}
          </p>
        )}
      </section>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <div className={styles.metrics}>
        {Object.entries(labels).map(([key, label]) => (
          <article key={key}>
            <span>{label}</span>
            <strong>{data?.summary[key] || 0}</strong>
          </article>
        ))}
      </div>
      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setLoading(true);
              setPage(1);
              setSearch(query.trim());
            }}
          >
            <label>
              Buscar por nombre o correo{" "}
              <input
                value={query}
                maxLength={191}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>{" "}
            <button>Buscar</button>
          </form>
          <label>
            Estado{" "}
            <select
              value={status}
              onChange={(event) => {
                setLoading(true);
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setRevision((value) => value + 1)}>
            Actualizar
          </button>
        </div>
        {loading ? (
          <p role="status">Cargando contactos…</p>
        ) : (
          <>
            <p>{data?.total || 0} contactos encontrados</p>
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Contacto</th>
                    <th>Origen</th>
                    <th>Estado</th>
                    <th>Registros enviados</th>
                    <th>Último envío confirmado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((contact) => (
                    <tr key={contact.email}>
                      <td>
                        <strong>{contact.name}</strong>
                        <br />
                        {contact.email}
                        {contact.phone && (
                          <>
                            <br />
                            {contact.phone}
                          </>
                        )}
                      </td>
                      <td>{contact.sources.join(", ")}</td>
                      <td>{labels[contact.status]}</td>
                      <td>
                        {contact.delivered} de {contact.registrations}
                      </td>
                      <td>
                        {contact.lastDeliveredAt
                          ? new Date(contact.lastDeliveredAt).toLocaleString(
                              "es-MX",
                            )
                          : "—"}
                      </td>
                      <td>
                        {contact.lastError ||
                          (contact.missing
                            ? `${contact.missing} sin enviar`
                            : contact.pending
                              ? `${contact.pending} pendientes`
                              : "Confirmado por Sendcorex")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data?.items.length && <p>No hay contactos con estos filtros.</p>}
            <div className={styles.toolbar}>
              <button
                disabled={page <= 1}
                onClick={() => {
                  setLoading(true);
                  setPage((value) => value - 1);
                }}
              >
                Anterior
              </button>
              <span>
                Página {page} de{" "}
                {Math.max(1, Math.ceil((data?.total || 0) / 25))}
              </span>
              <button
                disabled={page * 25 >= (data?.total || 0)}
                onClick={() => {
                  setLoading(true);
                  setPage((value) => value + 1);
                }}
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
