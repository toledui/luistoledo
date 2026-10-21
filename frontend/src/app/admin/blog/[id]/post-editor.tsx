"use client";
/* eslint-disable @next/next/no-img-element -- CMS images support arbitrary URLs and native loading. */
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Plus,
  Save,
  Eye,
  Pencil,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  blogBlockLabels,
  type BlogBlock,
  type BlogCategory,
  type BlogPost,
} from "@/lib/blog-types";
import { PostContent } from "@/components/blog/post-content";
import { MediaImageInput } from "../media-image-input";
import styles from "../blog-admin.module.css";
export function postPayload(post: BlogPost) {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverUrl: post.coverUrl || "",
    coverAlt: post.coverAlt || "",
    authorName: post.authorName,
    categoryId: post.categoryId || "",
    status: post.status || "DRAFT",
    blocks: post.blocks,
    seoTitle: post.seoTitle || "",
    seoDescription: post.seoDescription || "",
    publishedAt: post.publishedAt || null,
  };
}
function localDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function BlockFields({
  block,
  update,
}: {
  block: BlogBlock;
  update: (value: Partial<BlogBlock>) => void;
}) {
  return (
    <div className={styles.blockBody}>
      {["paragraph", "heading", "quote", "button", "video"].includes(
        block.type,
      ) && (
        <label className={styles.field}>
          {block.type === "button"
            ? "Texto del botón"
            : block.type === "video"
              ? "Título accesible del video"
              : "Contenido"}
          <textarea
            aria-label={
              block.type === "paragraph"
                ? "Texto del párrafo"
                : block.type === "heading"
                  ? "Texto del encabezado"
                  : block.type === "quote"
                    ? "Texto de la cita"
                    : block.type === "button"
                      ? "Texto del botón"
                      : "Título del video"
            }
            className={
              block.type === "heading" || block.type === "button"
                ? styles.short
                : undefined
            }
            maxLength={block.type === "heading" ? 500 : 12000}
            value={block.text || ""}
            placeholder={
              block.type === "paragraph"
                ? "Escribe el contenido de este párrafo…"
                : "Escribe aquí…"
            }
            onChange={(e) => update({ text: e.target.value })}
          />
        </label>
      )}
      {block.type === "heading" && (
        <label className={styles.field}>
          Nivel
          <select
            value={block.level || 2}
            onChange={(e) => update({ level: Number(e.target.value) as 2 | 3 })}
          >
            <option value={2}>H2 · Sección</option>
            <option value={3}>H3 · Subsección</option>
          </select>
        </label>
      )}
      {block.type === "image" && (
        <>
          <MediaImageInput
            value={block.url || ""}
            onChange={(url, alt) =>
              update({ url, ...(alt ? { alt: alt.slice(0, 250) } : {}) })
            }
          />
          <label className={styles.field}>
            Texto alternativo
            <input
              maxLength={250}
              placeholder="Describe lo que muestra la imagen"
              value={block.alt || ""}
              onChange={(e) => update({ alt: e.target.value })}
            />
          </label>
        </>
      )}
      {["button", "video"].includes(block.type) && (
        <label className={styles.field}>
          {block.type === "video"
            ? "URL de YouTube o Vimeo"
            : "Destino del botón"}
          <input
            maxLength={2000}
            value={block.url || ""}
            placeholder={
              block.type === "video"
                ? "https://www.youtube.com/watch?v=…"
                : "/cursos o https://…"
            }
            onChange={(e) => update({ url: e.target.value })}
          />
        </label>
      )}
      {["image", "video"].includes(block.type) && (
        <label className={styles.field}>
          Pie de contenido (opcional)
          <input
            maxLength={500}
            value={block.caption || ""}
            onChange={(e) => update({ caption: e.target.value })}
          />
        </label>
      )}
      {block.type === "quote" && (
        <label className={styles.field}>
          Autor o fuente (opcional)
          <input
            maxLength={150}
            value={block.attribution || ""}
            onChange={(e) => update({ attribution: e.target.value })}
          />
        </label>
      )}
      {block.type === "list" && (
        <>
          <label className={styles.field}>
            Un elemento por línea
            <textarea
              aria-label="Elementos de la lista"
              value={(block.items || []).join("\n")}
              onChange={(e) => update({ items: e.target.value.split("\n") })}
              placeholder={"Primer punto\nSegundo punto\nTercer punto"}
            />
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={!!block.ordered}
              onChange={(e) => update({ ordered: e.target.checked })}
            />
            Lista numerada
          </label>
        </>
      )}
      {block.type === "divider" && (
        <p className={styles.muted}>
          Una línea visual para separar secciones del artículo.
        </p>
      )}
    </div>
  );
}
export function BlogEditor({ id }: { id: string }) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost>();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [publishedUrl, setPublishedUrl] = useState("");
  const [baseline, setBaseline] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const dirty = !!post && JSON.stringify(postPayload(post)) !== baseline;
  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<BlogPost>(`/admin/blog/posts/${id}`),
      apiFetch<BlogCategory[]>("/admin/blog/categories"),
    ])
      .then(([value, list]) => {
        if (!active) return;
        setBaseline(JSON.stringify(postPayload(value)));
        setPost(value);
        setCategories(list);
        setSavedAt(value.updatedAt);
        setPublishedUrl(
          value.status === "PUBLISHED" &&
            value.publishedAt &&
            new Date(value.publishedAt).getTime() <= Date.now()
            ? `/blog/${value.slug}`
            : "",
        );
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    const reload = () => {
      void apiFetch<BlogCategory[]>("/admin/blog/categories")
        .then(setCategories)
        .catch(() => undefined);
    };
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const before = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      const a = (event.target as Element)?.closest?.("a");
      if (
        !a ||
        a.target === "_blank" ||
        a.href === location.href ||
        a.getAttribute("href")?.startsWith("#")
      )
        return;
      if (!confirm("Tienes cambios sin guardar. ¿Salir del editor?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  function change(value: Partial<BlogPost>) {
    setPost((current) => (current ? { ...current, ...value } : current));
    setMessage("");
  }
  function blocks(mutator: (items: BlogBlock[]) => BlogBlock[]) {
    setPost((current) =>
      current ? { ...current, blocks: mutator([...current.blocks]) } : current,
    );
    setMessage("");
  }
  function add(type: BlogBlock["type"]) {
    blocks((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        type,
        ...(type === "heading" ? { level: 2 as const } : {}),
        ...(type === "list"
          ? { items: [""], ordered: false }
          : type === "divider"
            ? {}
            : { text: "" }),
      },
    ]);
  }
  function move(index: number, direction: number) {
    blocks((items) => {
      const [item] = items.splice(index, 1);
      items.splice(index + direction, 0, item);
      return items;
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!post) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiFetch<BlogPost>(`/admin/blog/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postPayload(post)),
      });
      setBaseline(JSON.stringify(postPayload(result)));
      setPost(result);
      setSavedAt(result.updatedAt);
      setPublishedUrl(
        result.status === "PUBLISHED" &&
          result.publishedAt &&
          new Date(result.publishedAt).getTime() <= Date.now()
          ? `/blog/${result.slug}`
          : "",
      );
      setMessage(
        result.status === "PUBLISHED"
          ? result.publishedAt &&
            new Date(result.publishedAt).getTime() > Date.now()
            ? "Publicación programada. Aparecerá en el blog y el sitemap al llegar la fecha."
            : "Publicación guardada. El blog y el sitemap ya reflejan el contenido publicado."
          : "Cambios guardados. Este contenido permanece fuera del blog público y del sitemap.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !post ||
      !confirm(
        `¿Eliminar permanentemente “${post.title}”? También se eliminarán sus redirecciones. Puedes archivarla en su lugar.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/admin/blog/posts/${id}`, { method: "DELETE" });
      setBaseline(JSON.stringify(postPayload(post)));
      router.push("/admin/blog");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
      setBusy(false);
    }
  }
  if (loading) return <p role="status">Cargando constructor…</p>;
  if (!post)
    return (
      <div className={styles.page}>
        <p className={styles.error} role="alert">
          {error || "Publicación no encontrada"}
        </p>
        <Link href="/admin/blog">Volver al blog</Link>
      </div>
    );
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.categoryLink} href="/admin/blog">
            ← Publicaciones
          </Link>
          <h1>Constructor de artículos</h1>
          <span className={styles.saved}>
            {dirty
              ? "Cambios sin guardar"
              : `Guardado: ${new Date(savedAt).toLocaleString("es-MX")}`}
          </span>
        </div>
        <div className={styles.actions}>
          {publishedUrl && (
            <Link
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.button}
            >
              Ver publicado ↗
            </Link>
          )}
          <button type="button" onClick={() => setPreview(!preview)}>
            {preview ? <Pencil /> : <Eye />}
            {preview ? "Editar contenido" : "Vista previa"}
          </button>
          <button form="blog-editor" className={styles.primary} disabled={busy}>
            <Save />
            {busy
              ? "Guardando…"
              : post.status === "PUBLISHED"
                ? "Guardar y publicar"
                : "Guardar cambios"}
          </button>
        </div>
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
      <form id="blog-editor" onSubmit={save}>
        <fieldset className={styles.editor} disabled={busy}>
          <div className={styles.main}>
            <section className={styles.panel}>
              <div className={styles.fields}>
                <label>
                  Título del artículo
                  <input
                    required
                    maxLength={191}
                    value={post.title}
                    onChange={(e) => change({ title: e.target.value })}
                    placeholder="Una idea que merezca compartirse"
                  />
                </label>
                <label>
                  Resumen
                  <textarea
                    required={post.status === "PUBLISHED"}
                    maxLength={500}
                    value={post.excerpt}
                    onChange={(e) => change({ excerpt: e.target.value })}
                    placeholder="Explica en unas líneas qué aprenderá el lector."
                  />
                  <small>
                    {post.excerpt.length}/500 caracteres · aparece en las
                    tarjetas del blog
                  </small>
                </label>
              </div>
            </section>
            {preview ? (
              <section
                className={styles.preview}
                aria-label="Vista previa del artículo"
              >
                <span className={styles.eyebrow}>
                  Vista previa · cambios sin publicar
                </span>
                <h1>{post.title || "Título del artículo"}</h1>
                <p>{post.excerpt}</p>
                <p className={styles.muted}>Por {post.authorName}</p>
                {post.coverUrl && (
                  <img
                    className={styles.cover}
                    src={post.coverUrl}
                    alt={post.coverAlt || ""}
                  />
                )}
                <PostContent blocks={post.blocks} />
                {!post.blocks.length && (
                  <p>Agrega bloques para construir tu artículo.</p>
                )}
              </section>
            ) : (
              <section className={styles.panel}>
                <h2>Construye tu contenido</h2>
                <p className={styles.builderHint}>
                  Agrega los bloques que necesites. Puedes moverlos, duplicarlos
                  o eliminarlos y revisar el resultado en Vista previa.
                </p>
                <div className={styles.blocks}>
                  {post.blocks.map((block, index) => (
                    <article className={styles.block} key={block.id}>
                      <header className={styles.blockHead}>
                        <span>
                          {String(index + 1).padStart(2, "0")} ·{" "}
                          {blogBlockLabels[block.type]}
                        </span>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            title="Mover arriba"
                            aria-label={`Mover bloque ${index + 1} arriba`}
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                          >
                            <ArrowUp />
                          </button>
                          <button
                            type="button"
                            title="Mover abajo"
                            aria-label={`Mover bloque ${index + 1} abajo`}
                            disabled={index === post.blocks.length - 1}
                            onClick={() => move(index, 1)}
                          >
                            <ArrowDown />
                          </button>
                          <button
                            type="button"
                            title="Duplicar bloque"
                            aria-label={`Duplicar bloque ${index + 1}`}
                            disabled={post.blocks.length >= 100}
                            onClick={() =>
                              blocks((items) => {
                                items.splice(index + 1, 0, {
                                  ...block,
                                  id: crypto.randomUUID(),
                                });
                                return items;
                              })
                            }
                          >
                            <Copy />
                          </button>
                          <button
                            type="button"
                            title="Eliminar bloque"
                            aria-label={`Eliminar bloque ${index + 1}`}
                            onClick={() =>
                              blocks((items) =>
                                items.filter((item) => item.id !== block.id),
                              )
                            }
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </header>
                      <BlockFields
                        block={block}
                        update={(value) =>
                          blocks((items) =>
                            items.map((item) =>
                              item.id === block.id
                                ? { ...item, ...value }
                                : item,
                            ),
                          )
                        }
                      />
                    </article>
                  ))}
                </div>
                {!post.blocks.length && (
                  <div className={styles.empty}>
                    Tu artículo empieza aquí.
                    <br />
                    Selecciona un bloque para comenzar.
                  </div>
                )}
                <div className={styles.addBlocks}>
                  {(Object.keys(blogBlockLabels) as BlogBlock["type"][]).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        disabled={post.blocks.length >= 100}
                        onClick={() => add(type)}
                      >
                        <Plus />
                        {blogBlockLabels[type]}
                      </button>
                    ),
                  )}
                </div>
                <p className={styles.muted}>
                  {post.blocks.length}/100 bloques ·{" "}
                  {(
                    new TextEncoder().encode(JSON.stringify(post.blocks))
                      .length / 1000
                  ).toFixed(1)}
                  /75 KB de contenido
                </p>
              </section>
            )}
          </div>
          <aside className={styles.sidebar}>
            <section className={`${styles.panel} ${styles.fields}`}>
              <h2>Publicación</h2>
              <label>
                Estado
                <select
                  value={post.status || "DRAFT"}
                  onChange={(e) =>
                    change({ status: e.target.value as BlogPost["status"] })
                  }
                >
                  <option value="DRAFT">Borrador · privado</option>
                  <option value="PUBLISHED">Publicado</option>
                  <option value="ARCHIVED">Archivado · privado</option>
                </select>
                <small>El estado cambia al guardar.</small>
              </label>
              <label>
                Categoría
                <select
                  value={post.categoryId || ""}
                  onChange={(e) => change({ categoryId: e.target.value })}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                className={styles.categoryLink}
                href="/admin/blog/categorias"
                target="_blank"
                rel="noopener noreferrer"
              >
                Administrar categorías ↗
              </Link>
              <label>
                Autor
                <input
                  required
                  maxLength={150}
                  value={post.authorName}
                  onChange={(e) => change({ authorName: e.target.value })}
                />
              </label>
              <label>
                Fecha de publicación
                <input
                  type="datetime-local"
                  value={localDate(post.publishedAt)}
                  onChange={(e) =>
                    change({
                      publishedAt: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    })
                  }
                />
                <small>
                  Hora de este navegador. En blanco: publicar al guardar. Una
                  fecha futura programa la publicación.
                </small>
              </label>
            </section>
            <section className={`${styles.panel} ${styles.fields}`}>
              <h2>Imagen de portada</h2>
              {post.coverUrl && (
                <img
                  className={styles.cover}
                  src={post.coverUrl}
                  alt={post.coverAlt || ""}
                />
              )}
              <MediaImageInput
                value={post.coverUrl || ""}
                onChange={(url, alt) =>
                  change({
                    coverUrl: url,
                    ...(alt ? { coverAlt: alt.slice(0, 250) } : {}),
                  })
                }
              />
              <label>
                Texto alternativo
                <input
                  maxLength={250}
                  required={post.status === "PUBLISHED" && !!post.coverUrl}
                  value={post.coverAlt || ""}
                  onChange={(e) => change({ coverAlt: e.target.value })}
                  placeholder="Describe la portada"
                />
              </label>
            </section>
            <section className={`${styles.panel} ${styles.fields}`}>
              <h2>URL y buscadores</h2>
              <label>
                Slug
                <input
                  required
                  maxLength={170}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={post.slug}
                  onChange={(e) => change({ slug: e.target.value })}
                />
                <small>
                  /blog/{post.slug}
                  <br />
                  Las URLs anteriores de artículos publicados redirigen
                  automáticamente.
                </small>
              </label>
              <label>
                Título SEO (opcional)
                <input
                  maxLength={191}
                  value={post.seoTitle || ""}
                  onChange={(e) => change({ seoTitle: e.target.value })}
                />
              </label>
              <label>
                Descripción SEO (opcional)
                <textarea
                  maxLength={300}
                  value={post.seoDescription || ""}
                  onChange={(e) => change({ seoDescription: e.target.value })}
                />
                <small>
                  En blanco se utilizan el título y el resumen del artículo.
                </small>
              </label>
              <Link
                className={styles.categoryLink}
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver sitemap automático ↗
              </Link>
            </section>
            <section className={styles.panel}>
              <h2>Eliminar publicación</h2>
              <p className={styles.muted}>
                Para retirarla conservando el contenido, cambia el estado a
                Archivado y guarda.
              </p>
              <button
                className={styles.danger}
                disabled={busy}
                type="button"
                onClick={() => void remove()}
              >
                <Trash2 />
                Eliminar permanentemente
              </button>
            </section>
          </aside>
        </fieldset>
      </form>
    </main>
  );
}
