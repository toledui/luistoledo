import type { MetadataRoute } from "next";
import { blogFetch, siteUrl } from "@/lib/blog-server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // No persistent cache: publishing, scheduling, editing or withdrawing content is reflected on the next request.
  // Let API failures fail this request; never publish a misleading partial/empty sitemap.
  const content =
    await blogFetch<{ path: string; updatedAt: string }[]>("/sitemap");
  const staticPaths = [
    "/",
    "/cursos",
    "/eventos",
    "/blog",
    "/contacto",
    "/masterclass",
    "/privacidad",
    "/terminos",
  ];
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: siteUrl(path),
    ...(path === "/blog" &&
    content.some((item) => item.path.startsWith("/blog/"))
      ? {
          lastModified: new Date(
            Math.max(
              ...content
                .filter((item) => item.path.startsWith("/blog/"))
                .map((item) => new Date(item.updatedAt).getTime()),
            ),
          ),
        }
      : {}),
  }));
  entries.push(
    ...content.map((item) => ({
      url: siteUrl(item.path),
      lastModified: new Date(item.updatedAt),
    })),
  );
  if (entries.length > 50000)
    throw new Error(
      "Divide el sitemap en varios archivos antes de superar 50 000 URLs.",
    );
  return entries;
}
