"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { BlogCategory } from "@/lib/blog-types";
import styles from "../blog-admin.module.css";
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export default function BlogCategoriesPage() {
  const [items, setItems] = useState<BlogCategory[]>([]);
  const [editing, setEditing] = useState<string>();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      setItems(await apiFetch<BlogCategory[]>("/admin/blog/categories"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar las categorías",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  function reset() {
    setEditing(undefined);
    setName("");
    setSlug("");
    setDescription("");
    setSlugTouched(false);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiFetch(`/admin/blog/categories${editing ? `/${editing}` : ""}`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slug || undefined, description }),
      });
      reset();
      setMessage("Categoría guardada.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }
  async function remove(category: BlogCategory) {
    if (!confirm(`¿Eliminar la categoría “${category.name}”?`)) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/admin/blog/categories/${category.id}`, {
        method: "DELETE",
      });
      if (editing === category.id) reset();
      await load();
      setMessage("Categoría eliminada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Organiza tu contenido</span>
          <h1>Categorías del blog</h1>
          <p className={styles.muted}>
            Las categorías con artículos publicados aparecen automáticamente en
            el blog y el sitemap.
          </p>
        </div>
        <Link className={styles.button} href="/admin/blog">
          ← Publicaciones
        </Link>
      </header>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className={styles.success} role="status">
          {message}
        </p>
      )}
      <div className={styles.categoryLayout}>
        <form className={`${styles.panel} ${styles.fields}`} onSubmit={save}>
          <h2>{editing ? "Editar categoría" : "Nueva categoría"}</h2>
          <label>
            Nombre
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </label>
          <label>
            Slug de la URL
            <input
              required
              maxLength={170}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
            />
            <small>/blog/categoria/{slug || "nombre-de-categoria"}</small>
          </label>
          <label>
            Descripción
            <textarea
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button className={styles.primary} disabled={busy}>
              {busy
                ? "Guardando…"
                : editing
                  ? "Guardar cambios"
                  : "Crear categoría"}
            </button>
            {editing && (
              <button type="button" onClick={reset} disabled={busy}>
                Cancelar
              </button>
            )}
          </div>
        </form>
        <section className={styles.panel}>
          <h2>Categorías existentes</h2>
          {loading ? (
            <p role="status">Cargando…</p>
          ) : !items.length ? (
            <p className={styles.empty}>
              Crea la primera categoría para organizar tus artículos.
            </p>
          ) : (
            items.map((c) => (
              <article className={styles.categoryItem} key={c.id}>
                <div>
                  <strong>{c.name}</strong>
                  <span className={styles.slug}>/{c.slug}</span>
                  <p className={styles.muted}>{c.description}</p>
                  <span className={styles.muted}>
                    {c._count?.posts || 0} publicaciones
                  </span>
                </div>
                <div className={styles.actions}>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setEditing(c.id);
                      setName(c.name);
                      setSlug(c.slug);
                      setDescription(c.description || "");
                      setSlugTouched(true);
                      setMessage("");
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className={styles.danger}
                    disabled={busy || !!c._count?.posts}
                    title={
                      c._count?.posts
                        ? "Reasigna las publicaciones antes de eliminar esta categoría"
                        : "Eliminar categoría"
                    }
                    onClick={() => void remove(c)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
