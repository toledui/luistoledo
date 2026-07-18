"use client";

import { apiFetch } from "@/lib/api";
import { KeyRound, LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../account.module.css";

export default function SecurityPage() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function change() {
    setSaving(true);
    setMessage("");
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrent("");
      setNew("");
      setMessage("Contraseña actualizada y otras sesiones cerradas.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible actualizar",
      );
    } finally {
      setSaving(false);
    }
  }
  async function logoutAll() {
    await apiFetch("/auth/logout-all", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.avatar}>
            <KeyRound />
          </span>
          <div>
            <h1>Seguridad</h1>
            <p>Protege tu cuenta y administra tus sesiones.</p>
          </div>
        </header>
        <section className={styles.card}>
          <h2>Cambiar contraseña</h2>
          <div className={styles.grid}>
            <label className={styles.full}>
              Contraseña actual
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </label>
            <label className={styles.full}>
              Nueva contraseña
              <input
                type="password"
                minLength={10}
                value={newPassword}
                onChange={(event) => setNew(event.target.value)}
                placeholder="Mínimo 10 caracteres"
              />
            </label>
          </div>
          {message && <p className={styles.message}>{message}</p>}
          <button
            onClick={() => void change()}
            disabled={saving || !currentPassword || newPassword.length < 10}
          >
            {saving ? <LoaderCircle /> : <KeyRound />} Actualizar contraseña
          </button>
          <div className={styles.danger}>
            <h2>Cerrar todas las sesiones</h2>
            <p>
              Se cerrará la sesión en todos tus dispositivos, incluido este.
            </p>
            <button onClick={() => void logoutAll()}>
              <LogOut /> Cerrar todas las sesiones
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
