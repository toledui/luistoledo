import { cache } from "react";
import { notFound } from "next/navigation";
import type { BlogCategory, BlogPage, BlogPost } from "./blog-types";
const api = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");
export function siteUrl(path = "/") {
  return new URL(
    path,
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ).href;
}
export async function blogFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${api}/blog${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) notFound();
  if (!response.ok)
    throw new Error(
      "El blog no está disponible temporalmente. Intenta nuevamente.",
    );
  return response.json() as Promise<T>;
}
export const getBlogPost = cache((slug: string) =>
  blogFetch<BlogPost | { redirectTo: string }>(
    `/posts/${encodeURIComponent(slug)}`,
  ),
);
export const getBlogCategory = cache((slug: string) =>
  blogFetch<BlogCategory>(`/categories/${encodeURIComponent(slug)}`),
);
export function getBlogList(page = 1, category?: string, search?: string) {
  const params = new URLSearchParams({ page: String(page), limit: "12" });
  if (category) params.set("category", category);
  if (search) params.set("search", search.slice(0, 100));
  return blogFetch<BlogPage>(`/posts?${params}`);
}
export function pageNumber(value?: string) {
  const page = Number(value || 1);
  if (!Number.isInteger(page) || page < 1 || page > 100000) notFound();
  return page;
}
