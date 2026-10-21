"use client";
import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import styles from "../../analitica/analytics.module.css";
type Settings = {
  enabled: boolean;
  gtmId: string | null;
  gaMeasurementId: string | null;
  gaPropertyId: string | null;
  metaPixelId: string | null;
  metaApiVersion: string;
  searchConsoleSite: string | null;
  retainIpDays: number;
  retainEventsDays: number;
  gaSecretConfigured: boolean;
  metaTokenConfigured: boolean;
  googleCredentialsConfigured: boolean;
};
export default function AnalyticsSettingsPage() {
  const [form, setForm] = useState<Settings>();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [gaSecret, setGaSecret] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [googleCredentials, setGoogleCredentials] = useState("");
  const [clear, setClear] = useState<string[]>([]);
  useEffect(() => {
    apiFetch<Settings>("/admin/analytics/settings")
      .then(setForm)
      .catch((e) => setError(e.message));
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = form;
      // Send only editable settings; metadata from the API is deliberately excluded.
      const result = await apiFetch<Settings>("/admin/analytics/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: data.enabled,
          gtmId: data.gtmId || "",
          gaMeasurementId: data.gaMeasurementId || "",
          gaPropertyId: data.gaPropertyId || "",
          metaPixelId: data.metaPixelId || "",
          metaApiVersion: data.metaApiVersion,
          searchConsoleSite: data.searchConsoleSite || "",
          retainIpDays: data.retainIpDays,
          retainEventsDays: data.retainEventsDays,
          ...(gaSecret || clear.includes("gaSecret") ? { gaSecret } : {}),
          ...(metaToken || clear.includes("metaToken") ? { metaToken } : {}),
          ...(googleCredentials || clear.includes("googleCredentials")
            ? { googleCredentials }
            : {}),
        }),
      });
      setForm(result);
      setGaSecret("");
      setMetaToken("");
      setGoogleCredentials("");
      setClear([]);
      setSuccess(
        "Configuración guardada. Verifica los eventos en las herramientas de Google y Meta antes de publicar tus campañas.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }
  if (!form)
    return (
      <div className={styles.page}>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <p role="status">Cargando configuración…</p>
        )}
      </div>
    );
  const field = (
    key:
      | "gtmId"
      | "gaMeasurementId"
      | "gaPropertyId"
      | "metaPixelId"
      | "metaApiVersion"
      | "searchConsoleSite",
    label: string,
    placeholder: string,
  ) => (
    <label>
      {label}
      <input
        value={form[key] || ""}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value.trim() })}
      />
    </label>
  );
  const remove = (key: string, label: string) => (
    <label className={styles.check}>
      <input
        type="checkbox"
        checked={clear.includes(key)}
        onChange={(e) =>
          setClear(
            e.target.checked ? [...clear, key] : clear.filter((k) => k !== key),
          )
        }
      />
      Eliminar {label} guardado
    </label>
  );
  return (
    <div className={styles.page}>
      <form className={styles.form} onSubmit={save}>
        <section className={styles.panel}>
          <h2>Analítica e integraciones</h2>
          <p>
            El registro propio funciona al aceptar las cookies de analítica.
            Guardar una clave no confirma que la conexión externa esté
            verificada.
          </p>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Habilitar medición y preferencias de cookies
          </label>
        </section>
        <section className={styles.panel}>
          <h2>Google Tag Manager y GA4</h2>
          <div className={styles.fields}>
            {field("gtmId", "Contenedor GTM", "GTM-…")}
            {field("gaMeasurementId", "ID de medición GA4", "G-…")}
            {field(
              "gaPropertyId",
              "ID numérico de propiedad GA4 · reportes",
              "123456789",
            )}
            <label>
              Secreto de Measurement Protocol
              <input
                type="password"
                autoComplete="new-password"
                value={gaSecret}
                onChange={(e) => setGaSecret(e.target.value)}
                placeholder={
                  form.gaSecretConfigured
                    ? "Configurado · deja vacío para conservar"
                    : "Necesario para conversiones desde servidor"
                }
              />
            </label>
          </div>
          {form.gaSecretConfigured && remove("gaSecret", "secreto de Google")}
          <p>
            Con GTM, importa y configura el contenedor de eventos incluido en la
            documentación del proyecto. Sin GTM, GA4 se carga directamente con
            el ID de medición. Evita instalar ambas etiquetas manualmente.
          </p>
        </section>
        <section className={styles.panel}>
          <h2>Meta Pixel y Conversions API</h2>
          <div className={styles.fields}>
            {field("metaPixelId", "ID del píxel / dataset", "123456789")}
            {field("metaApiVersion", "Versión Graph API", "v25.0")}
            <label className={styles.wide}>
              Token de Conversions API
              <input
                type="password"
                autoComplete="new-password"
                value={metaToken}
                onChange={(e) => setMetaToken(e.target.value)}
                placeholder={
                  form.metaTokenConfigured
                    ? "Configurado · deja vacío para conservar"
                    : "Token generado en Meta Events Manager"
                }
              />
            </label>
          </div>
          {form.metaTokenConfigured && remove("metaToken", "token de Meta")}
          <p>
            Los eventos del navegador y del servidor comparten event_id. Las
            compras se envían desde el servidor al confirmar el pago. No
            agregues otro píxel mediante GTM.
          </p>
        </section>
        <section className={styles.panel}>
          <h2>Reportes de Google y palabras clave</h2>
          <div className={styles.fields}>
            {field(
              "searchConsoleSite",
              "Propiedad de Search Console",
              "sc-domain:luistoledo.com.mx",
            )}
            <label className={styles.wide}>
              JSON de cuenta de servicio de Google
              <textarea
                autoComplete="off"
                value={googleCredentials}
                onChange={(e) => setGoogleCredentials(e.target.value)}
                placeholder={
                  form.googleCredentialsConfigured
                    ? "Credenciales guardadas y cifradas · deja vacío para conservar"
                    : "Pega el JSON de una cuenta de servicio con permisos de lectura"
                }
              />
            </label>
          </div>
          {form.googleCredentialsConfigured &&
            remove("googleCredentials", "JSON de Google")}
          <p>
            Habilita Google Analytics Data API y Search Console API en Google
            Cloud. Da acceso de lectura al correo de la cuenta de servicio en
            ambas propiedades. Las consultas de Google son agregadas; no revelan
            lo que escribió cada visitante.
          </p>
        </section>
        <section className={styles.panel}>
          <h2>Retención de datos</h2>
          <div className={styles.fields}>
            <label>
              Conservar IP · días (0 desactiva)
              <input
                type="number"
                min={0}
                max={30}
                required
                value={form.retainIpDays}
                onChange={(e) =>
                  setForm({ ...form, retainIpDays: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Conservar sesiones y eventos · días
              <input
                type="number"
                min={7}
                max={365}
                required
                value={form.retainEventsDays}
                onChange={(e) =>
                  setForm({ ...form, retainEventsDays: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <p>
            Las IP se guardan cifradas y requieren un permiso adicional para
            consultarlas. La limpieza se ejecuta diariamente a las 03:00 de
            Ciudad de México.
          </p>
        </section>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className={styles.success} role="status">
            {success}
          </p>
        )}
        <footer>
          <button disabled={busy}>
            {busy ? "Guardando…" : "Guardar configuración"}
          </button>
        </footer>
      </form>
    </div>
  );
}
