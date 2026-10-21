/* eslint-disable @next/next/no-img-element -- CMS images support arbitrary URLs and native loading. */
import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { getBlogPost, siteUrl } from "@/lib/blog-server";
import { getSiteMetadata } from "@/lib/site-metadata";
import { PostContent } from "@/components/blog/post-content";
import styles from "@/components/blog/blog.module.css";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost((await params).slug);
  if ("redirectTo" in post) permanentRedirect(post.redirectTo);
  const base = await getSiteMetadata({
    path: `/blog/${post.slug}`,
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
  });
  return {
    ...base,
    alternates: { canonical: siteUrl(`/blog/${post.slug}`) },
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt,
      authors: [post.authorName],
      ...(post.coverUrl
        ? {
            images: [
              { url: siteUrl(post.coverUrl), alt: post.coverAlt || post.title },
            ],
          }
        : {}),
    },
    ...(post.coverUrl
      ? {
          twitter: {
            card: "summary_large_image",
            title: post.seoTitle || post.title,
            description: post.seoDescription || post.excerpt,
            images: [siteUrl(post.coverUrl)],
          },
        }
      : {}),
  };
}
export default async function BlogPostPage({ params }: Props) {
  const post = await getBlogPost((await params).slug);
  if ("redirectTo" in post) permanentRedirect(post.redirectTo);
  const words = post.blocks.reduce(
    (sum, block) =>
      sum +
      (block.text || (block.items || []).join(" ")).split(/\s+/).filter(Boolean)
        .length,
    0,
  );
  const structured = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.authorName },
    mainEntityOfPage: siteUrl(`/blog/${post.slug}`),
    ...(post.coverUrl ? { image: siteUrl(post.coverUrl) } : {}),
  };
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
          }}
        />
        <nav className={styles.breadcrumbs} aria-label="Ubicación">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <Link href="/blog">Blog</Link>
          {post.category && (
            <>
              <span>/</span>
              <Link href={`/blog/categoria/${post.category.slug}`}>
                {post.category.name}
              </Link>
            </>
          )}
        </nav>
        <span className={styles.eyebrow}>
          {post.category?.name || "Blog · Luis Toledo"}
        </span>
        <h1 className={styles.heading}>{post.title}</h1>
        <p className={styles.intro}>{post.excerpt}</p>
        <div className={styles.meta}>
          <span>Por {post.authorName}</span>
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "America/Mexico_City",
              })}
            </time>
          )}
          <span>{Math.max(1, Math.ceil(words / 200))} min de lectura</span>
        </div>
        {post.coverUrl && (
          <img
            className={styles.heroImage}
            src={post.coverUrl}
            alt={post.coverAlt || ""}
          />
        )}
        <PostContent blocks={post.blocks} />
        <div className={styles.after}>
          <Link href="/blog">← Volver al blog</Link>
          <Link href="/cursos">Seguir aprendiendo →</Link>
        </div>
      </article>
    </main>
  );
}
