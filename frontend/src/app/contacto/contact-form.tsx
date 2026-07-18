"use client";
import { apiFetch } from "@/lib/api";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
} from "lucide-react";
import Script from "next/script";
import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./contact.module.css";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
        },
      ) => string;
    };
  }
}
type Settings = { turnstileEnabled: boolean; turnstileSiteKey?: string };

export function ContactForm() {
  const [settings, setSettings] = useState<Settings>();
  const [scriptReady, setScriptReady] = useState(false);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const widget = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  useEffect(() => {
    apiFetch<Settings>("/contacts/settings")
      .then(setSettings)
      .catch(() => setSettings({ turnstileEnabled: false }));
  }, []);
  useEffect(() => {
    if (
      !scriptReady ||
      !settings?.turnstileEnabled ||
      !settings.turnstileSiteKey ||
      !widget.current ||
      rendered.current ||
      !window.turnstile
    )
      return;
    window.turnstile.render(widget.current, {
      sitekey: settings.turnstileSiteKey,
      callback: setToken,
      "expired-callback": () => setToken(""),
    });
    rendered.current = true;
  }, [scriptReady, settings]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone") || undefined,
          subject: form.get("subject"),
          message: form.get("message"),
          turnstileToken: token || undefined,
        }),
      });
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible enviar tu mensaje.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      {settings?.turnstileEnabled && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          onLoad={() => setScriptReady(true)}
        />
      )}
      <main className={styles.page}>
        <section className={styles.intro}>
          <span>
            <MessageSquare /> Hablemos
          </span>
          <h1>¿En qué podemos ayudarte?</h1>
          <p>
            Cuéntanos qué necesitas. Tu solicitud quedará registrada y
            responderemos directamente a tu correo.
          </p>
          <div className={styles.details}>
            <article>
              <Clock3 />
              <div><strong>Respuesta ágil</strong><small>Normalmente dentro de un día hábil.</small></div>
            </article>
            <article>
              <Mail />
              <div><strong>Atención directa</strong><small>Recibirás la respuesta en tu correo.</small></div>
            </article>
            <article>
              <ShieldCheck />
              <div><strong>Datos protegidos</strong><small>Tu información no se comparte con terceros.</small></div>
            </article>
          </div>
        </section>
        <section className={styles.card}>
          {sent ? (
            <div className={styles.success}>
              <CheckCircle2 />
              <h2>Mensaje recibido</h2>
              <p>
                Registramos correctamente tu solicitud. Muy pronto nos pondremos
                en contacto contigo.
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <header className={styles.formHeader}>
                <span>Formulario de contacto</span>
                <h2>Escríbenos un mensaje</h2>
                <p>Completa los datos y cuéntanos con detalle cómo podemos ayudarte.</p>
              </header>
              <div className={styles.grid}>
                <label>
                  Nombre completo
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={160}
                    placeholder="Tu nombre"
                  />
                </label>
                <label>
                  Correo electrónico
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="nombre@correo.com"
                  />
                </label>
                <label>
                  Teléfono <small>(opcional)</small>
                  <input name="phone" maxLength={40} placeholder="+52..." />
                </label>
                <label>
                  Asunto
                  <input
                    name="subject"
                    required
                    minLength={3}
                    maxLength={200}
                    placeholder="¿Cómo podemos ayudarte?"
                  />
                </label>
                <label className={styles.full}>
                  Mensaje
                  <textarea
                    name="message"
                    required
                    minLength={10}
                    maxLength={5000}
                    rows={7}
                    placeholder="Cuéntanos los detalles..."
                  />
                </label>
              </div>
              {settings?.turnstileEnabled && (
                <div ref={widget} className={styles.turnstile} />
              )}
              {error && <p className={styles.error}>{error}</p>}
              <button
                disabled={
                  saving || Boolean(settings?.turnstileEnabled && !token)
                }
              >
                {saving ? <LoaderCircle className={styles.spin} /> : <Send />}
                Enviar mensaje
              </button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
