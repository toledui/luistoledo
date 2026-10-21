"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Tags, FilePenLine } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { BlogCategory, BlogPage } from "@/lib/blog-types";
import styles from "./blog-admin.module.css";
export default function BlogAdminPage() {
  const [now, setNow] = useState(0);
  const router = useRouter();
  const [data, setData] = useState<BlogPage>();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setNow(Date.now());
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
      });
      setData(await apiFetch<BlogPage>(`/admin/blog/posts?${params}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el blog");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, category]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    apiFetch<BlogCategory[]>("/admin/blog/categories")
      .then(setCategories)
      .catch(() => undefined);
  }, []);
  async function create(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const post = await apiFetch<{ id: string }>("/admin/blog/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      router.push(`/admin/blog/${post.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear");
      setCreating(false);
    }
  }
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Contenido y conocimiento</span>
          <h1>Blog</h1>
          <p className={styles.muted}>
            Crea artículos, organiza tus ideas y comparte lo que sabes.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.button} href="/admin/blog/categorias">
            <Tags />
            Categorías
          </Link>
          <Link
            className={styles.button}
            href="/blog"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver blog ↗
          </Link>
          <button
            className={styles.primary}
            onClick={() => setNewOpen(!newOpen)}
          >
            <Plus />
            Nueva publicación
          </button>
        </div>
      </header>
      {newOpen && (
        <form onSubmit={create} className={styles.panel}>
          <h2>Comienza con un título</h2>
          <div className={styles.toolbar}>
            <input
              autoFocus
              required
              maxLength={191}
              aria-label="Título de la publicación"
              placeholder="¿Qué quieres compartir?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button
              className={styles.primary}
              disabled={creating || !title.trim()}
            >
              {creating ? "Creando…" : "Crear borrador"}
            </button>
          </div>
          <p className={styles.muted}>
            El artículo permanecerá privado hasta que lo publiques.
          </p>
        </form>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <input
            type="search"
            maxLength={100}
            aria-label="Buscar publicaciones"
            placeholder="Buscar por título o resumen"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            <option value="DRAFT">Borradores</option>
            <option value="PUBLISHED">Publicadas y programadas</option>
            <option value="ARCHIVED">Archivadas</option>
          </select>
          <select
            aria-label="Categoría"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option value={c.slug} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {loading && (
          <p className={styles.muted} role="status">
            Cargando publicaciones…
          </p>
        )}
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Publicación</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Actualización</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((post) => {
                const scheduled =
                  post.status === "PUBLISHED" &&
                  post.publishedAt &&
                  new Date(post.publishedAt).getTime() > now;
                return (
                  <tr key={post.id}>
                    <td>
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className={styles.title}
                      >
                        {post.title}
                      </Link>
                      <span className={styles.slug}>/blog/{post.slug}</span>
                    </td>
                    <td>{post.category?.name || "Sin categoría"}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${scheduled ? styles.scheduled : post.status === "PUBLISHED" ? styles.published : ""}`}
                      >
                        {scheduled
                          ? "Programada"
                          : post.status === "PUBLISHED"
                            ? "Publicada"
                            : post.status === "ARCHIVED"
                              ? "Archivada"
                              : "Borrador"}
                      </span>
                    </td>
                    <td>
                      {new Date(post.updatedAt).toLocaleDateString("es-MX")}
                    </td>
                    <td>
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className={styles.button}
                      >
                        <FilePenLine />
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && !data?.items.length && (
          <div className={styles.empty}>
            No hay publicaciones en esta vista.
            <br />
            Crea tu primer borrador para empezar.
          </div>
        )}
        {data && data.pages > 1 && (
          <footer className={styles.pagination}>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {data.pages} · {data.total} publicaciones
            </span>
            <button
              disabled={page >= data.pages || loading}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </button>
          </footer>
        )}
      </section>
    </main>
  );
}
