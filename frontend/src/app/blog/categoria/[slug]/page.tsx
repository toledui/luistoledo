import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogList } from "@/components/blog/blog-list";
import {
  blogFetch,
  getBlogCategory,
  getBlogList,
  pageNumber,
  siteUrl,
} from "@/lib/blog-server";
import type { BlogCategory } from "@/lib/blog-types";
import { getSiteMetadata } from "@/lib/site-metadata";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = await getBlogCategory(slug);
  const page = pageNumber(query.page);
  const path = `/blog/categoria/${category.slug}`;
  return {
    ...(await getSiteMetadata({
      path,
      title: `${category.name} · Blog`,
      description:
        category.description ||
        `Artículos sobre ${category.name} en Luis Toledo Academy.`,
    })),
    alternates: {
      canonical: siteUrl(page > 1 ? `${path}?page=${page}` : path),
    },
    ...(query.search ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const page = pageNumber(query.page);
  const [category, categories, data] = await Promise.all([
    getBlogCategory(slug),
    blogFetch<BlogCategory[]>("/categories"),
    getBlogList(page, slug, query.search),
  ]);
  if (page > 1 && !data.items.length) notFound();
  return (
    <BlogList
      data={data}
      categories={categories}
      category={category}
      search={query.search}
    />
  );
}
