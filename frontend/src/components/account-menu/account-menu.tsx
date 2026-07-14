"use client";

import { apiFetch } from "@/lib/api";
import {
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./account-menu.module.css";

type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

export function AccountMenu({ mobile = false }: { mobile?: boolean }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    void apiFetch<SessionUser>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  if (!checked) return <div className={styles.placeholder} />;
  if (!user)
    return (
      <div className={`${styles.guest} ${mobile ? styles.mobile : ""}`}>
        <Link href="/login">Iniciar sesión</Link>
        <Link href="/registro">Crear cuenta</Link>
      </div>
    );

  const initials = `${user.firstName[0] || ""}${user.lastName[0] || ""}`;
  const admin = user.roles.some((role) =>
    ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role),
  );

  return (
    <div className={`${styles.account} ${mobile ? styles.mobile : ""}`} ref={root}>
      <button className={styles.trigger} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{initials.toUpperCase()}</span>
        <div><strong>{user.firstName}</strong><small>Mi cuenta</small></div>
        <ChevronDown />
      </button>
      {open && (
        <div className={styles.menu}>
          <header><span>{initials.toUpperCase()}</span><div><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></div></header>
          <nav>
            <Link href="/mi-aprendizaje" onClick={() => setOpen(false)}><BookOpen />Mis cursos</Link>
            <Link href="/mi-aprendizaje/pedidos" onClick={() => setOpen(false)}><ReceiptText />Pedidos y pagos</Link>
            <Link href="/mi-cuenta" onClick={() => setOpen(false)}><UserRound />Información personal</Link>
            <Link href="/mi-cuenta/seguridad" onClick={() => setOpen(false)}><ShieldCheck />Seguridad y sesiones</Link>
            {admin && <Link href="/admin" onClick={() => setOpen(false)}><LayoutDashboard />Panel administrativo</Link>}
          </nav>
          <button className={styles.logout} onClick={() => void logout()}><LogOut />Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}
