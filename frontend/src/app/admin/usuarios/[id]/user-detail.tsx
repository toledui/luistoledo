"use client";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  KeyRound,
  LoaderCircle,
  Monitor,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./user-detail.module.css";
type Session = {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
};
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  emailVerifiedAt?: string;
  createdAt: string;
  roles: string[];
  sessions: Session[];
};
export function UserDetail({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    const value = await apiFetch<User>(`/admin/users/${id}`);
    setUser(value);
    setStatus(value.status);
    setRoles(value.roles);
    setBusy(false);
  }, [id]);
  useEffect(() => {
    void apiFetch<User>(`/admin/users/${id}`).then((value) => {
      setUser(value);
      setStatus(value.status);
      setRoles(value.roles);
      setBusy(false);
    });
  }, [id]);
  async function update(path: string, body?: unknown) {
    setBusy(true);
    setMsg("");
    try {
      await apiFetch(`/admin/users/${id}/${path}`, {
        method: path.includes("sessions") ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      await load();
      setMsg("Cambios guardados.");
    } catch (e) {
      setMsg(
        e instanceof Error ? e.message : "No fue posible completar la acción.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <div className={styles.loading}>
        <LoaderCircle />
        Cargando usuario…
      </div>
    );
  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/admin/usuarios">
        <ArrowLeft size={16} />
        Volver a usuarios
      </Link>
      <header>
        <div className={styles.avatar}>
          {user.firstName[0]}
          {user.lastName[0]}
        </div>
        <div>
          <span>Perfil de usuario</span>
          <h1>
            {user.firstName} {user.lastName}
          </h1>
          <p>{user.email}</p>
        </div>
      </header>
      <div className={styles.layout}>
        <section className={styles.settings}>
          <article>
            <div className={styles.title}>
              <UserRound />
              <div>
                <h2>Estado de la cuenta</h2>
                <p>Suspender revoca automáticamente todas sus sesiones.</p>
              </div>
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>ACTIVE</option>
              <option>PENDING_VERIFICATION</option>
              <option>SUSPENDED</option>
              <option>DELETED</option>
            </select>
            <button
              onClick={() => update("status", { status })}
              disabled={busy}
            >
              <Save size={15} />
              Guardar estado
            </button>
          </article>
          <article>
            <div className={styles.title}>
              <ShieldCheck />
              <div>
                <h2>Roles y permisos</h2>
                <p>Define qué áreas puede utilizar este usuario.</p>
              </div>
            </div>
            <div className={styles.roleChecks}>
              {["STUDENT", "ADMIN", "SUPER_ADMIN"].map((role) => (
                <label key={role}>
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    onChange={(e) =>
                      setRoles((current) =>
                        e.target.checked
                          ? [...current, role]
                          : current.filter((item) => item !== role),
                      )
                    }
                  />
                  {role}
                </label>
              ))}
            </div>
            <button
              onClick={() => update("roles", { roles })}
              disabled={busy || !roles.length}
            >
              <Save size={15} />
              Guardar roles
            </button>
          </article>
          {msg && <div className={styles.message}>{msg}</div>}
        </section>
        <aside className={styles.sessions}>
          <div className={styles.title}>
            <Monitor />
            <div>
              <h2>Sesiones</h2>
              <p>
                {user.sessions.filter((session) => !session.revokedAt).length}{" "}
                activas
              </p>
            </div>
          </div>
          <button
            className={styles.revokeAll}
            onClick={() => update("sessions/revoke-all")}
          >
            <KeyRound size={14} />
            Revocar todas
          </button>
          {user.sessions.map((session) => (
            <div className={styles.session} key={session.id}>
              <strong>{session.userAgent?.split(" ")[0] ?? "Navegador"}</strong>
              <small>
                {session.ipAddress ?? "IP desconocida"} ·{" "}
                {new Date(session.createdAt).toLocaleString("es-MX")}
              </small>
              <span
                className={session.revokedAt ? styles.revoked : styles.current}
              >
                {session.revokedAt ? "Revocada" : "Activa"}
              </span>
              {!session.revokedAt && (
                <button onClick={() => update(`sessions/${session.id}/revoke`)}>
                  Revocar
                </button>
              )}
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}
