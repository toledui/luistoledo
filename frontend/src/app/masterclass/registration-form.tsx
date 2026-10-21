"use client";

import Link from "next/link";
import Script from "next/script";
import {
  CheckCircle2,
  LoaderCircle,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { masterclass } from "@/lib/masterclass";
import styles from "./masterclass.module.css";

type Settings = {
  turnstileEnabled: boolean;
  turnstileSiteKey?: string;
  registrationOpen: boolean;
};
// Same explicit widget API as the contact form, with cleanup and token renewal.
type Turnstile = {
  render(
    element: HTMLElement,
    options: {
      sitekey: string;
      callback(token: string): void;
      "expired-callback"(): void;
      "error-callback"(): void;
      size: "flexible";
    },
  ): string;
  remove(id: string): void;
  reset(id: string): void;
};
const turnstile = () =>
  (window as unknown as { turnstile?: Turnstile }).turnstile;

export function MasterclassForm() {
  const [settings, setSettings] = useState<Settings>();
  const [scriptReady, setScriptReady] = useState(false);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [groupUrl, setGroupUrl] = useState("");
  const [error, setError] = useState("");
  const [settingsError, setSettingsError] = useState(false);
  const [reload, setReload] = useState(0);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const submitting = useRef(false);
  const success = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    apiFetch<Settings>("/masterclass")
      .then((value) => {
        if (active) {
          setSettings(value);
          setSettingsError(false);
        }
      })
      .catch(() => {
        if (active) setSettingsError(true);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  useEffect(() => {
    const api = turnstile();
    if (
      !scriptReady ||
      !settings?.turnstileEnabled ||
      !settings.turnstileSiteKey ||
      !widget.current ||
      !api ||
      groupUrl
    )
      return;
    widgetId.current = api.render(widget.current, {
      sitekey: settings.turnstileSiteKey,
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
      size: "flexible",
    });
    return () => {
      if (widgetId.current) api.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [scriptReady, settings, groupUrl]);
  useEffect(() => {
    if (groupUrl) success.current?.focus();
  }, [groupUrl]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !settings || !settings.registrationOpen) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await apiFetch<{
        success: boolean;
        whatsappGroupUrl: string;
      }>("/masterclass/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          whatsapp: data.get("whatsapp"),
          consent: data.get("consent") === "on",
          turnstileToken: token || undefined,
        }),
      });
      if (
        !response.success ||
        !response.whatsappGroupUrl.startsWith("https://chat.whatsapp.com/")
      )
        throw new Error(
          "No pudimos confirmar el registro. Intenta nuevamente.",
        );
      setGroupUrl(response.whatsappGroupUrl);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible guardar tu inscripción. Intenta nuevamente.",
      );
      if (widgetId.current) turnstile()?.reset(widgetId.current);
      setToken("");
    } finally {
      setSaving(false);
      submitting.current = false;
    }
  }

  if (groupUrl)
    return (
      <div
        className={`${styles.formCard} ${styles.success}`}
        ref={success}
        tabIndex={-1}
        role="status"
      >
        <CheckCircle2 size={44} />
        <span className={styles.kicker}>REGISTRO CONFIRMADO</span>
        <h2>¡Tu lugar está registrado!</h2>
        <p>
          Nos vemos el{" "}
          <strong>
            {masterclass.date} a las {masterclass.time}
          </strong>
          , hora de Ciudad de México.
        </p>
        <div className={styles.nextStep}>
          <h3>Ahora entra al grupo de WhatsApp</h3>
          <p>
            Ahí compartiremos el enlace de acceso y los avisos de la sesión. Tu
            inscripción ya quedó guardada; falta que aceptes la invitación al
            grupo.
          </p>
          <a
            href={groupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappButton}
          >
            <MessageCircle size={20} /> Unirme al grupo de WhatsApp{" "}
            <ArrowRight size={18} />
          </a>
        </div>
        <p className={styles.note}>
          WhatsApp se abrirá en otra pestaña. Al unirte, otros participantes
          podrán ver tu número conforme a las opciones del grupo.
        </p>
      </div>
    );

  return (
    <div className={styles.formCard}>
      {settings?.turnstileEnabled && (
        <Script
          id="masterclass-turnstile"
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          onReady={() => setScriptReady(true)}
          onError={() =>
            setError(
              "No se pudo cargar la verificación. Recarga la página para intentar de nuevo.",
            )
          }
        />
      )}
      <span className={styles.kicker}>TU PRIMER PASO EMPIEZA AQUÍ</span>
      <h2>Reserva tu lugar gratis</h2>
      <p>
        Regístrate y entra al grupo para recibir el acceso a la sesión. No
        necesitas crear una cuenta.
      </p>
      {settingsError && (
        <p role="alert" className={styles.error}>
          No pudimos cargar el registro.{" "}
          <button
            type="button"
            onClick={() => {
              setSettingsError(false);
              setReload((value) => value + 1);
            }}
          >
            Reintentar
          </button>
        </p>
      )}
      {settings && !settings.registrationOpen ? (
        <p className={styles.error}>El registro para esta sesión ha cerrado.</p>
      ) : (
        <form onSubmit={submit}>
          <label>
            Nombre completo
            <input
              name="name"
              autoComplete="name"
              placeholder="Tu nombre"
              required
              minLength={2}
              maxLength={160}
            />
          </label>
          <label>
            Correo electrónico
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nombre@correo.com"
              required
              maxLength={191}
            />
          </label>
          <label>
            Número de WhatsApp
            <input
              name="whatsapp"
              aria-label="Número de WhatsApp"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="55 1234 5678 o +52 55 1234 5678"
              required
              maxLength={30}
              aria-describedby="whatsapp-help"
            />
            <small id="whatsapp-help">
              Puedes escribir tus 10 dígitos o incluir la clave de tu país, con
              o sin +.
            </small>
          </label>
          <label className={styles.consent}>
            <input name="consent" type="checkbox" required />
            <span>
              He leído el{" "}
              <Link
                href="/aviso-de-privacidad"
                target="_blank"
                rel="noopener noreferrer"
              >
                aviso de privacidad
              </Link>{" "}
              y acepto que me contacten por correo y WhatsApp para coordinar mi
              participación en esta masterclass.
            </span>
          </label>
          {settings?.turnstileEnabled && (
            <div ref={widget} className={styles.widget} />
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <button
            className={styles.submit}
            disabled={
              saving ||
              !settings ||
              !settings.registrationOpen ||
              Boolean(settings.turnstileEnabled && !token)
            }
          >
            {saving ? (
              <>
                <LoaderCircle size={20} /> Guardando mi registro…
              </>
            ) : (
              <>
                Reservar mi lugar gratis <ArrowRight size={19} />
              </>
            )}
          </button>
          {!settings && !settingsError && (
            <p className={styles.note}>Cargando formulario…</p>
          )}
          <p className={styles.note}>
            Después de registrarte podrás unirte al grupo de WhatsApp. El
            registro no te agrega automáticamente.
          </p>
        </form>
      )}
    </div>
  );
}
