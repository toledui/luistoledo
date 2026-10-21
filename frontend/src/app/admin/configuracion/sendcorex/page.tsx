"use client";
import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import styles from "../../analitica/analytics.module.css";

type Settings = { enabled: boolean; apiKeyConfigured: boolean };
type Status = {
  counts: Record<string, number>;
  recent: {
    id: string;
    source: string;
    status: string;
    attempts: number;
    lastError: string | null;
  }[];
};
const labels: Record<string, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Enviando",
  DELIVERED: "Enviado",
  FAILED: "Requiere revisión",
};
export default function SendcorexPage() {
  const [settings, setSettings] = useState<Settings>();
  const [status, setStatus] = useState<Status>();
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    const load = () =>
      Promise.all([
        apiFetch<Settings>("/admin/sendcorex/settings"),
        apiFetch<Status>("/admin/sendcorex/status"),
      ])
        .then(([config, state]) => {
          if (active) {
            setSettings(config);
            setStatus(state);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    void load();
    const timer = setInterval(() => {
      void apiFetch<Status>("/admin/sendcorex/status")
        .then((state) => {
          if (active) setStatus(state);
        })
        .catch(() => {
          /* The next refresh can recover without discarding form edits. */
        });
    }, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await apiFetch<Settings>("/admin/sendcorex/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: settings.enabled,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          clearApiKey,
        }),
      });
      setSettings(saved);
      setApiKey("");
      setClearApiKey(false);
      setMessage("Configuración guardada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }
  async function retry() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiFetch<{ queued: number }>(
        "/admin/sendcorex/retry",
        { method: "POST" },
      );
      setStatus(await apiFetch<Status>("/admin/sendcorex/status"));
      setMessage(`${result.queued} registros listos para reintentar.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reintentar");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.page}>
      <form className={styles.form} onSubmit={save}>
        <section className={styles.panel}>
          <h2>Sendcorex · Contactos y newsletter</h2>
          <p>
            Sincroniza nuevas inscripciones a masterclasses y cursos gratuitos,
            de pago y asignados desde el admin. Los contactos del formulario se
            sincronizan cuando eligen recibir el boletín.
          </p>
          <p>
            Se envían nombre, correo, teléfono disponible y etiquetas de origen.
            Las etiquetas permiten crear segmentos en Sendcorex: newsletter,
            masterclass y curso. Se conservan las bajas que ya existan en
            Sendcorex.
          </p>
          {settings ? (
            <>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, enabled: e.target.checked })
                  }
                />
                Activar sincronización automática
              </label>
              <label>
                Clave API de Sendcorex
                <input
                  type="password"
                  autoComplete="new-password"
                  maxLength={4096}
                  value={apiKey}
                  placeholder={
                    settings.apiKeyConfigured
                      ? "Clave guardada · escribe para reemplazar"
                      : "Pega tu clave API"
                  }
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </label>
              <p>
                La clave se guarda cifrada. Déjala vacía para conservarla.
                Requiere permisos contact:create y contact:update.{" "}
                <a
                  href="https://docs.sendcorex.com/api-reference/contacts/contacts/upsert-contacts"
                  target="_blank"
                  rel="noreferrer"
                >
                  Documentación de Sendcorex
                </a>
                .
              </p>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={clearApiKey}
                  onChange={(e) => setClearApiKey(e.target.checked)}
                />
                Eliminar clave guardada (desactiva la sincronización antes)
              </label>
              <button disabled={busy}>
                {busy ? "Guardando…" : "Guardar configuración"}
              </button>
            </>
          ) : (
            <p>Cargando configuración…</p>
          )}
        </section>
      </form>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <section className={styles.panel}>
        <h2>Estado de sincronización</h2>
        <p>
          <Link href="/admin/contactos-sendcorex">
            Ver todos los contactos y sincronizar históricos
          </Link>
        </p>
        <p>
          Los registros nuevos se guardan en una cola. Al activar la integración
          también se procesarán los pendientes. No se importan inscripciones
          anteriores a esta implementación.
        </p>
        {status && (
          <>
            <p>
              {Object.entries(labels)
                .map(([key, label]) => `${label}: ${status.counts[key] || 0}`)
                .join(" · ")}
            </p>
            <button
              type="button"
              disabled={busy || !status.counts.FAILED}
              onClick={retry}
            >
              Reintentar registros fallidos
            </button>
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Origen</th>
                    <th>Estado</th>
                    <th>Intentos</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {status.recent.map((job) => (
                    <tr key={job.id}>
                      <td>{job.source}</td>
                      <td>{labels[job.status] || job.status}</td>
                      <td>{job.attempts}</td>
                      <td>{job.lastError || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!status.recent.length && (
              <p>Aún no hay registros para sincronizar.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
