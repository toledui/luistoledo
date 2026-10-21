/* eslint-disable @next/next/no-img-element -- CMS images support arbitrary URLs and native loading. */
import Link from "next/link";
import type { BlogCategory, BlogPage } from "@/lib/blog-types";
import styles from "./blog.module.css";
export function BlogList({
  data,
  categories,
  category,
  search = "",
}: {
  data: BlogPage;
  categories: BlogCategory[];
  category?: BlogCategory;
  search?: string;
}) {
  const path = category ? `/blog/categoria/${category.slug}` : "/blog";
  const pageUrl = (page: number) =>
    `${path}?${new URLSearchParams({ page: String(page), ...(search ? { search } : {}) })}`;
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <span className={styles.eyebrow}>
          {category
            ? "Explora una categoría"
            : "Ideas para llevar a la práctica"}
        </span>
        <h1 className={styles.heading}>
          {category?.name || "Aprende. Aplica. Avanza."}
        </h1>
        <p className={styles.intro}>
          {category?.description ||
            "Guías, ideas y experiencias sobre tecnología, marketing y negocios. Un espacio para convertir el conocimiento en resultados."}
        </p>
        <div className={styles.filters}>
          <Link href="/blog" aria-current={!category ? "page" : undefined}>
            Todos los artículos
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/blog/categoria/${c.slug}`}
              aria-current={category?.id === c.id ? "page" : undefined}
            >
              {c.name}
            </Link>
          ))}
          <form action={path}>
            <input
              type="search"
              name="search"
              defaultValue={search}
              maxLength={100}
              placeholder="Buscar artículos"
              aria-label="Buscar artículos"
            />
            <button>Buscar</button>
          </form>
        </div>
        {data.items.length ? (
          <div className={styles.grid}>
            {data.items.map((post) => (
              <article key={post.id} className={styles.card}>
                <Link
                  href={`/blog/${post.slug}`}
                  className={styles.cover}
                  aria-label={post.title}
                >
                  {post.coverUrl ? (
                    <img
                      src={post.coverUrl}
                      alt={post.coverAlt || ""}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.placeholder} aria-hidden="true">
                      LT.
                    </div>
                  )}
                </Link>
                <div className={styles.cardBody}>
                  {post.category && (
                    <Link
                      href={`/blog/categoria/${post.category.slug}`}
                      className={styles.cardCategory}
                    >
                      {post.category.name}
                    </Link>
                  )}
                  <h2>
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p>{post.excerpt}</p>
                  <div className={styles.cardFooter}>
                    <span>
                      {post.publishedAt &&
                        new Date(post.publishedAt).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "America/Mexico_City",
                        })}
                    </span>
                    <Link href={`/blog/${post.slug}`}>Leer artículo →</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            {search
              ? "No encontramos artículos con esa búsqueda."
              : "Estamos preparando nuevas ideas para compartir contigo. Vuelve pronto."}
          </div>
        )}
        {data.pages > 1 && (
          <nav className={styles.pagination} aria-label="Páginas del blog">
            {data.page > 1 && (
              <Link href={pageUrl(data.page - 1)}>← Anterior</Link>
            )}
            <span>
              Página {data.page} de {data.pages}
            </span>
            {data.page < data.pages && (
              <Link href={pageUrl(data.page + 1)}>Siguiente →</Link>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
