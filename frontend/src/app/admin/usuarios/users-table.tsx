"use client";
import { apiFetch } from "@/lib/api";
import { ChevronRight, Filter, Search, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./users.module.css";
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  emailVerifiedAt?: string;
  createdAt: string;
  roles: string[];
  _count: { sessions: number };
};
type Result = {
  items: User[];
  pagination: { page: number; pages: number; total: number };
};
export function UsersTable() {
  const [data, setData] = useState<Result | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: "1", limit: "25" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (role) params.set("role", role);
    try {
      setData(await apiFetch<Result>(`/admin/users?${params}`));
    } finally {
      setLoading(false);
    }
  }, [search, status, role]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  return (
    <main className={styles.page}>
      <header>
        <div>
          <span>Administración · Usuarios</span>
          <h1>Personas y accesos.</h1>
          <p>Gestiona alumnos, administradores, estados y sesiones.</p>
        </div>
        <div className={styles.total}>
          <Users />
          <strong>{data?.pagination.total ?? 0}</strong>
          <small>usuarios</small>
        </div>
      </header>
      <section className={styles.filters}>
        <label>
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nombre o correo"
          />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option>ACTIVE</option>
          <option>PENDING_VERIFICATION</option>
          <option>SUSPENDED</option>
          <option>DELETED</option>
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Todos los roles</option>
          <option>STUDENT</option>
          <option>ADMIN</option>
          <option>SUPER_ADMIN</option>
        </select>
        <button
          onClick={() => {
            setSearch("");
            setStatus("");
            setRole("");
          }}
        >
          <Filter size={15} />
          Limpiar
        </button>
      </section>
      <section className={styles.table}>
        <div className={styles.head}>
          <span>Usuario</span>
          <span>Estado</span>
          <span>Roles</span>
          <span>Registro</span>
          <span />
        </div>
        {loading ? (
          <div className={styles.empty}>Cargando usuarios…</div>
        ) : data?.items.length ? (
          data.items.map((user) => (
            <Link
              href={`/admin/usuarios/${user.id}`}
              className={styles.row}
              key={user.id}
            >
              <div className={styles.user}>
                <i>
                  {user.firstName[0]}
                  {user.lastName[0]}
                </i>
                <span>
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <small>{user.email}</small>
                </span>
              </div>
              <span
                className={`${styles.badge} ${styles[user.status.toLowerCase()]}`}
              >
                {user.status}
              </span>
              <div className={styles.roles}>
                {user.roles.map((value) => (
                  <b key={value}>{value}</b>
                ))}
              </div>
              <time>
                {new Date(user.createdAt).toLocaleDateString("es-MX")}
              </time>
              <ChevronRight size={17} />
            </Link>
          ))
        ) : (
          <div className={styles.empty}>
            No encontramos usuarios con esos filtros.
          </div>
        )}
      </section>
    </main>
  );
}
