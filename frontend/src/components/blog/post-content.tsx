import type { BlogBlock } from "@/lib/blog-types";
import styles from "./blog.module.css";
function link(url?: string) {
  if (!url || /[\u0000-\u001f\\]/.test(url)) return undefined;
  if (/^\/(?!\/)/.test(url)) return url;
  try {
    const u = new URL(url);
    if (["https:", "http:"].includes(u.protocol) && !u.username && !u.password)
      return u.href;
  } catch {}
  return undefined;
}
function video(url?: string) {
  try {
    const u = new URL(url || "");
    const host = u.hostname.replace(/^www\./, "");
    if (u.protocol !== "https:") return undefined;
    if (["youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) {
      const id =
        host === "youtu.be"
          ? u.pathname.slice(1)
          : u.searchParams.get("v") ||
            u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1];
      if (id && /^[\w-]{11}$/.test(id))
        return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (["vimeo.com", "player.vimeo.com"].includes(host)) {
      const id = u.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return undefined;
}
export function PostContent({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className={styles.content}>
      {blocks.map((block) => {
        switch (block.type) {
          case "heading":
            return block.level === 3 ? (
              <h3 key={block.id}>{block.text}</h3>
            ) : (
              <h2 key={block.id}>{block.text}</h2>
            );
          case "paragraph":
            return <p key={block.id}>{block.text}</p>;
          case "quote":
            return (
              <blockquote key={block.id}>
                <p>{block.text}</p>
                {block.attribution && <cite>{block.attribution}</cite>}
              </blockquote>
            );
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List key={block.id}>
                {block.items?.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </List>
            );
          }
          case "image": {
            const url = link(block.url);
            return url ? (
              <figure key={block.id}>
                {/* Arbitrary CMS images retain native lazy loading without widening Next's image-host allowlist. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={block.alt || ""} loading="lazy" />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            ) : null;
          }
          case "button": {
            const url = link(block.url);
            return url ? (
              <p key={block.id}>
                <a
                  className={styles.cta}
                  href={url}
                  rel={
                    url.startsWith("http") ? "noopener noreferrer" : undefined
                  }
                >
                  {block.text || "Más información"}{" "}
                  <span aria-hidden="true">↗</span>
                </a>
              </p>
            ) : null;
          }
          case "video": {
            const url = video(block.url);
            return url ? (
              <figure key={block.id}>
                <iframe
                  src={url}
                  title={block.text || "Video del artículo"}
                  loading="lazy"
                  allow="fullscreen; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            ) : null;
          }
          case "divider":
            return <hr key={block.id} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
