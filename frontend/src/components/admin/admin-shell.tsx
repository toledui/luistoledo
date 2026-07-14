"use client";

import { apiFetch, ApiError } from "@/lib/api";
import {
  BookOpen,
  ChevronRight,
  CircleGauge,
  LogOut,
  Menu,
  Images,
  Settings2,
  ShieldCheck,
  Users,
  ReceiptText,
  TicketPercent,
  MessageSquare,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import styles from "./admin-shell.module.css";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
};
const SessionContext = createContext<SessionUser | null>(null);
export const useSessionUser = () => useContext(SessionContext);

const navigation = [
  { href: "/admin", label: "Resumen", icon: CircleGauge },
  { href: "/admin/cursos", label: "Cursos", icon: BookOpen },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/pedidos", label: "Pedidos", icon: ReceiptText },
  { href: "/admin/cupones", label: "Cupones", icon: TicketPercent },
  { href: "/admin/medios", label: "Medios", icon: Images },
  { href: "/admin/contacto", label: "Contacto", icon: MessageSquare },
  {
    href: "/admin/configuracion",
    label: "Configuración",
    icon: Settings2,
  },
  {
    href: "/admin/auditoria",
    label: "Auditoría",
    icon: ShieldCheck,
    disabled: true,
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    apiFetch<SessionUser>("/auth/me")
      .then(setUser)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401)
          router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" }, false).catch(
      () => undefined,
    );
    router.replace("/login");
  }

  if (loading)
    return (
      <div className={styles.loading}>
        <span>LT</span>
        <p>Verificando sesión segura…</p>
      </div>
    );
  if (!user) return null;

  return (
    <SessionContext.Provider value={user}>
      <div className={styles.shell}>
        <aside className={`${styles.sidebar} ${menuOpen ? styles.open : ""}`}>
          <div className={styles.logo}>
            <span>LT</span>
            <div>
              <strong>Luis Toledo</strong>
              <small>Academy Admin</small>
            </div>
            <button onClick={() => setMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <nav>
            {navigation.map(({ href, label, icon: Icon, disabled }) =>
              disabled ? (
                <span className={styles.disabled} key={href}>
                  <Icon size={18} />
                  {label}
                  <small>Pronto</small>
                </span>
              ) : (
                <Link
                  className={
                    pathname === href ||
                    (href !== "/admin" && pathname.startsWith(href))
                      ? styles.active
                      : ""
                  }
                  href={href}
                  key={href}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon size={18} />
                  {label}
                  <ChevronRight size={15} />
                </Link>
              ),
            )}
          </nav>
          <div className={styles.sidebarFooter}>
            <div className={styles.avatar}>
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div>
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <small>{user.roles.join(", ")}</small>
            </div>
            <button onClick={logout} title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </aside>
        {menuOpen && (
          <button
            className={styles.overlay}
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          />
        )}
        <div className={styles.content}>
          <header className={styles.topbar}>
            <button
              className={styles.menuButton}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div>
              <small>Panel administrativo</small>
              <strong>{user.email}</strong>
            </div>
            <Link href="/">Ver sitio público</Link>
          </header>
          <div className={styles.page}>{children}</div>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
