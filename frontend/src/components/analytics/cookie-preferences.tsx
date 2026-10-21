"use client";
import { useEffect, useState } from "react";
import { readConsent, setConsent } from "@/lib/analytics";
import styles from "./cookie-preferences.module.css";

export function CookiePreferences() {
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => {
      const consent = readConsent();
      setAnalytics(consent?.analytics ?? false);
      setAdvertising(consent?.advertising ?? false);
      setLoaded(true);
    };
    const timer = setTimeout(sync, 0);
    window.addEventListener("lta:consent", sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("lta:consent", sync);
    };
  }, []);
  async function save(a: boolean, b: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await setConsent(a, b);
      setAnalytics(a);
      setAdvertising(b);
      setMessage(
        "Preferencias guardadas en este navegador. Puedes volver a cambiarlas cuando quieras.",
      );
    } catch {
      setError("No se pudieron guardar las preferencias. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.panel}>
      <p>
        Las necesarias mantienen la sesión, la seguridad y el carrito. Puedes
        decidir por separado sobre analítica y publicidad.
      </p>
      <fieldset disabled={!loaded || busy}>
        <legend>Preferencias de este navegador</legend>
        <label>
          <input type="checkbox" checked disabled />
          Necesarias (siempre activas)
        </label>
        <label>
          <input
            type="checkbox"
            checked={analytics}
            onChange={(event) => setAnalytics(event.target.checked)}
          />
          Analítica: medición propia y Google Analytics
        </label>
        <label>
          <input
            type="checkbox"
            checked={advertising}
            onChange={(event) => setAdvertising(event.target.checked)}
          />
          Publicidad: Meta y medición publicitaria de Google
        </label>
      </fieldset>
      <div className={styles.actions}>
        <button
          type="button"
          disabled={!loaded || busy}
          onClick={() => void save(false, false)}
        >
          Solo necesarias
        </button>
        <button
          type="button"
          disabled={!loaded || busy}
          onClick={() => void save(analytics, advertising)}
        >
          Guardar preferencias
        </button>
        <button
          type="button"
          disabled={!loaded || busy}
          onClick={() => void save(true, true)}
        >
          Aceptar todas
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
