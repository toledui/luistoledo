"use client";

import { apiFetch } from "@/lib/api";
import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  Save,
  Send,
  Server,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import styles from "./email.module.css";

type Settings = {
  provider: string;
  host?: string;
  port: number;
  encryption: string;
  tlsEnabled: boolean;
  sslEnabled: boolean;
  fromName: string;
  fromEmail: string;
  replyToEmail?: string;
  adminNotificationEmail?: string;
  enabled: boolean;
  saveLogs: boolean;
  timeoutMs: number;
  maxRetries: number;
  usernameConfigured: boolean;
  passwordConfigured: boolean;
};
type Status = {
  provider: string;
  enabled: boolean;
  configured: boolean;
  lastTestedAt?: string;
  lastSuccessAt?: string;
  lastErrorMessage?: string;
  sentToday: number;
  failed: number;
  pending: number;
};
type FormValues = Settings & { username?: string; password?: string };

export function EmailSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [testRecipient, setTestRecipient] = useState(
    "contacto@luistoledo.com.mx",
  );
  const { register, handleSubmit, reset, control } = useForm<FormValues>();
  const provider = useWatch({ control, name: "provider" });
  const usernameConfigured = useWatch({ control, name: "usernameConfigured" });
  const passwordConfigured = useWatch({ control, name: "passwordConfigured" });
  const load = useCallback(async () => {
    const [settings, current] = await Promise.all([
      apiFetch<Settings>("/admin/email/settings"),
      apiFetch<Status>("/admin/email/status"),
    ]);
    reset(settings);
    setStatus(current);
  }, [reset]);
  useEffect(() => {
    void Promise.all([
      apiFetch<Settings>("/admin/email/settings"),
      apiFetch<Status>("/admin/email/status"),
    ])
      .then(([settings, current]) => {
        reset(settings);
        setStatus(current);
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [reset]);
  async function save(values: FormValues) {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        provider: values.provider,
        host: values.host || undefined,
        port: values.port,
        encryption: values.encryption,
        tlsEnabled: values.tlsEnabled,
        sslEnabled: values.sslEnabled,
        username: values.username || undefined,
        password: values.password || undefined,
        fromName: values.fromName,
        fromEmail: values.fromEmail,
        replyToEmail: values.replyToEmail || undefined,
        adminNotificationEmail: values.adminNotificationEmail || undefined,
        enabled: values.enabled,
        saveLogs: values.saveLogs,
        timeoutMs: values.timeoutMs,
        maxRetries: values.maxRetries,
      };
      const persisted = await apiFetch<Settings>("/admin/email/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      reset(persisted);
      setStatus(await apiFetch<Status>("/admin/email/status"));
      setMessage(
        `Guardado en MySQL · proveedor ${persisted.provider} · ${new Date().toLocaleTimeString("es-MX")}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }
  async function test() {
    setSaving(true);
    setMessage("");
    try {
      const result = await apiFetch<{ message: string }>("/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: testRecipient }),
      });
      setMessage(result.message);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falló la prueba.");
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <div className={styles.loading}>
        <LoaderCircle />
        Cargando servicio de correo…
      </div>
    );
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span>Configuración · Correo</span>
          <h1>Correo transaccional bajo control.</h1>
          <p>
            Configura el proveedor sin guardar credenciales en archivos de
            entorno.
          </p>
        </div>
        <button form="email-form" disabled={saving}>
          {saving ? (
            <LoaderCircle className={styles.spin} />
          ) : (
            <Save size={17} />
          )}
          Guardar
        </button>
      </header>
      {status && (
        <section className={styles.status}>
          <article>
            <Mail />
            <div>
              <span>Proveedor</span>
              <strong>{status.provider}</strong>
            </div>
          </article>
          <article>
            <CheckCircle2 />
            <div>
              <span>Enviados hoy</span>
              <strong>{status.sentToday}</strong>
            </div>
          </article>
          <article>
            <Server />
            <div>
              <span>Pendientes</span>
              <strong>{status.pending}</strong>
            </div>
          </article>
          <article className={status.lastErrorMessage ? styles.danger : ""}>
            <TriangleAlert />
            <div>
              <span>Estado</span>
              <strong>
                {status.lastErrorMessage
                  ? "Con errores"
                  : status.configured
                    ? "Configurado"
                    : "Pendiente"}
              </strong>
            </div>
          </article>
        </section>
      )}
      <div className={styles.layout}>
        <form
          id="email-form"
          onSubmit={handleSubmit(save)}
          className={styles.form}
        >
          <section>
            <div className={styles.title}>
              <Server />
              <div>
                <h2>Proveedor</h2>
                <p>Modo log es ideal durante el desarrollo.</p>
              </div>
            </div>
            <div className={styles.grid}>
              <label>
                Proveedor
                <select {...register("provider")}>
                  <option value="LOG">Modo log</option>
                  <option value="SMTP">SMTP personalizado</option>
                  <option value="GMAIL">Gmail SMTP</option>
                  <option value="MICROSOFT">Microsoft SMTP</option>
                  <option value="AMAZON_SES">Amazon SES</option>
                  <option value="SENDGRID">SendGrid</option>
                  <option value="RESEND">Resend</option>
                  <option value="DISABLED">Desactivado</option>
                </select>
              </label>
              <label>
                Puerto
                <input
                  type="number"
                  {...register("port", { valueAsNumber: true })}
                />
              </label>
              {provider !== "LOG" && provider !== "DISABLED" && (
                <>
                  <label className={styles.full}>
                    Host SMTP
                    <input
                      {...register("host")}
                      placeholder="smtp.example.com"
                    />
                  </label>
                  <label>
                    Usuario
                    <input
                      {...register("username")}
                      placeholder={
                        usernameConfigured
                          ? "Configurado · escribe para sustituir"
                          : "Usuario SMTP"
                      }
                    />
                    {usernameConfigured && (
                      <small className={styles.configured}>
                        ● Usuario cifrado y guardado
                      </small>
                    )}
                  </label>
                  <label>
                    Contraseña
                    <input
                      type="password"
                      {...register("password")}
                      placeholder={
                        passwordConfigured
                          ? "•••••••• · escribe para sustituir"
                          : "Contraseña SMTP"
                      }
                    />
                    {passwordConfigured && (
                      <small className={styles.configured}>
                        ● Contraseña cifrada y guardada
                      </small>
                    )}
                  </label>
                  <label>
                    Seguridad
                    <select {...register("encryption")}>
                      <option>STARTTLS</option>
                      <option>TLS</option>
                      <option>NONE</option>
                    </select>
                  </label>
                  <label className={styles.check}>
                    <input type="checkbox" {...register("tlsEnabled")} />
                    TLS habilitado
                  </label>
                  <label className={styles.check}>
                    <input type="checkbox" {...register("sslEnabled")} />
                    SSL directo
                  </label>
                </>
              )}
            </div>
          </section>
          <section>
            <div className={styles.title}>
              <Mail />
              <div>
                <h2>Remitente</h2>
                <p>Identidad utilizada en los mensajes.</p>
              </div>
            </div>
            <div className={styles.grid}>
              <label>
                Nombre
                <input {...register("fromName")} />
              </label>
              <label>
                Correo
                <input type="email" {...register("fromEmail")} />
              </label>
              <label>
                Responder a<input type="email" {...register("replyToEmail")} />
              </label>
              <label>
                Notificaciones administrativas
                <input type="email" {...register("adminNotificationEmail")} />
              </label>
              <label className={styles.check}>
                <input type="checkbox" {...register("enabled")} />
                Envío habilitado
              </label>
              <label className={styles.check}>
                <input type="checkbox" {...register("saveLogs")} />
                Guardar historial
              </label>
            </div>
          </section>
          <section className={styles.secrets}>
            <ShieldCheck />
            <div>
              <strong>Secretos protegidos</strong>
              <p>
                Usuario y contraseña se cifran con AES-256-GCM y nunca se
                devuelven al navegador.
              </p>
            </div>
            <KeyRound />
          </section>
          {message && <div className={styles.message}>{message}</div>}
        </form>
        <aside className={styles.test}>
          <div className={styles.title}>
            <Send />
            <div>
              <h2>Correo de prueba</h2>
              <p>Valida la configuración actual.</p>
            </div>
          </div>
          <label>
            Destinatario
            <input
              type="email"
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
            />
          </label>
          <button onClick={test} disabled={saving || !testRecipient}>
            <Send size={16} />
            Enviar prueba
          </button>
          {status?.lastSuccessAt && (
            <small>
              Último éxito:{" "}
              {new Date(status.lastSuccessAt).toLocaleString("es-MX")}
            </small>
          )}
          {status?.lastErrorMessage && (
            <div className={styles.error}>{status.lastErrorMessage}</div>
          )}
        </aside>
      </div>
    </main>
  );
}
