"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  initializeAnalytics,
  readConsent,
  setConsent,
  trackEvent,
  trackPage,
  type AnalyticsConfig,
} from "@/lib/analytics";
import styles from "./analytics.module.css";

export function AnalyticsProvider() {
  const pathname = usePathname();
  const [config, setConfig] = useState<AnalyticsConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/analytics/config`,
    )
      .then((r) => (r.ok ? (r.json() as Promise<AnalyticsConfig>) : null))
      .then(async (value) => {
        if (!active || !value) return;
        setConfig(value);
        setOpen(value.enabled && !readConsent());
        await initializeAnalytics(value);
        trackPage();
      })
      .catch(() => undefined);
    const preferences = () => {
      const c = readConsent();
      setAnalytics(c?.analytics ?? false);
      setAdvertising(c?.advertising ?? false);
      setOpen(true);
    };
    const ready = () => trackPage();
    const consentChanged = () => {
      setOpen(false);
    };
    const sync = (event: StorageEvent) => {
      if (event.key === "lta_consent_v1") location.reload();
    };
    window.addEventListener("lta:preferences", preferences);
    window.addEventListener("lta:consent", consentChanged);
    window.addEventListener("lta:analytics-ready", ready);
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      window.removeEventListener("lta:preferences", preferences);
      window.removeEventListener("lta:consent", consentChanged);
      window.removeEventListener("lta:analytics-ready", ready);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    trackPage();
  }, [pathname]);
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const started = new WeakSet<HTMLFormElement>();
    let scrolled = false;
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.("a");
      if (!anchor) return;
      try {
        const u = new URL(anchor.href);
        if (
          ["wa.me", "api.whatsapp.com", "chat.whatsapp.com"].includes(
            u.hostname,
          )
        )
          void trackEvent("whatsapp_click");
      } catch {}
    };
    const form = (event: FocusEvent) => {
      const element = (event.target as Element)?.closest?.("form");
      if (element && !started.has(element)) {
        started.add(element);
        void trackEvent("form_start");
      }
    };
    const scroll = () => {
      if (
        !scrolled &&
        document.documentElement.scrollHeight > innerHeight &&
        (scrollY + innerHeight) / document.documentElement.scrollHeight >= 0.9
      ) {
        scrolled = true;
        void trackEvent("scroll");
      }
    };
    document.addEventListener("click", click);
    document.addEventListener("focusin", form);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      document.removeEventListener("click", click);
      document.removeEventListener("focusin", form);
      window.removeEventListener("scroll", scroll);
    };
  }, [pathname]);
  async function save(a: boolean, b: boolean) {
    setSaving(true);
    try {
      await setConsent(a, b);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }
  if (!config?.enabled || pathname.startsWith("/admin")) return null;
  return (
    <>
      {open && (
        <section
          className={styles.banner}
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-title"
        >
          <div>
            <h2 id="cookie-title">Tú eliges cómo usamos las cookies</h2>
            <p>
              Las necesarias mantienen tu sesión y carrito. Con tu permiso
              medimos visitas, procedencia y actividad; las publicitarias
              comparten eventos con Meta y Google para medir campañas. Puedes
              cambiar tu elección en cualquier momento.{" "}
              <a href="/aviso-de-privacidad">Aviso de privacidad</a> ·{" "}
              <a href="/politica-de-cookies">Política de cookies</a>
            </p>
            <div className={styles.options}>
              <label>
                <input type="checkbox" checked disabled />
                Necesarias
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                />
                Analítica
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={advertising}
                  onChange={(e) => setAdvertising(e.target.checked)}
                />
                Publicidad
              </label>
            </div>
          </div>
          <div className={styles.actions}>
            <button disabled={saving} onClick={() => void save(false, false)}>
              Solo necesarias
            </button>
            <button
              disabled={saving}
              onClick={() => void save(analytics, advertising)}
            >
              Guardar elección
            </button>
            <button disabled={saving} onClick={() => void save(true, true)}>
              Aceptar todas
            </button>
          </div>
        </section>
      )}
    </>
  );
}
