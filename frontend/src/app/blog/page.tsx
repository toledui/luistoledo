import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogList } from "@/components/blog/blog-list";
import { blogFetch, getBlogList, pageNumber, siteUrl } from "@/lib/blog-server";
import type { BlogCategory } from "@/lib/blog-types";
import { getSiteMetadata } from "@/lib/site-metadata";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}): Promise<Metadata> {
  const query = await searchParams;
  const page = pageNumber(query.page);
  return {
    ...(await getSiteMetadata({
      path: "/blog",
      title: "Blog",
      description:
        "Ideas y guías prácticas sobre tecnología, inteligencia artificial, marketing y negocios con Luis Toledo.",
    })),
    alternates: {
      canonical: siteUrl(page > 1 ? `/blog?page=${page}` : "/blog"),
    },
    ...(query.search ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const query = await searchParams;
  const page = pageNumber(query.page);
  const [data, categories] = await Promise.all([
    getBlogList(page, undefined, query.search),
    blogFetch<BlogCategory[]>("/categories"),
  ]);
  if (page > 1 && !data.items.length) notFound();
  return <BlogList data={data} categories={categories} search={query.search} />;
}
