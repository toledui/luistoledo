export type BlogBlock = {
  id: string;
  type:
    | "paragraph"
    | "heading"
    | "image"
    | "quote"
    | "list"
    | "button"
    | "video"
    | "divider";
  text?: string;
  level?: 2 | 3;
  url?: string;
  alt?: string;
  caption?: string;
  attribution?: string;
  items?: string[];
  ordered?: boolean;
};
export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count?: { posts: number };
};
export type BlogCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverUrl?: string | null;
  coverAlt?: string | null;
  authorName: string;
  category: BlogCategory | null;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string | null;
  updatedAt: string;
};
export type BlogPost = BlogCard & {
  blocks: BlogBlock[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  categoryId?: string | null;
  createdAt: string;
};
export type BlogPage = {
  items: BlogCard[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};
export const blogBlockLabels: Record<BlogBlock["type"], string> = {
  paragraph: "Texto",
  heading: "Encabezado",
  image: "Imagen",
  quote: "Cita",
  list: "Lista",
  button: "Botón",
  video: "Video",
  divider: "Separador",
};
